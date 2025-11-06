import os
import json
import time
import uuid
import logging
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import aiosqlite
import aiofiles
import httpx
from datetime import datetime

## --- CONFIG (prefer env vars) ---
DATA_DIR = os.getenv("GURIRI_DATA_DIR", "/opt/guriri-prod")
DB_PATH = os.path.join(DATA_DIR, "data", "guriri.db")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
LOG_DIR = os.path.join(DATA_DIR, "logs")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")  # Ollama HTTP API base
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "dolphin-mistral:7b-v2.6-dpo-laser-q8_0")
ADMIN_TOKEN = os.getenv("GURIRI_ADMIN_TOKEN", "changeme_admin_token")  # set strong token in env

# Ensure dirs exist
os.makedirs(os.path.join(DATA_DIR, "data"), exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "backend.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("guriri-backend")

app = FastAPI(title="Guriri Express Backend")

# Rotas de páginas HTML
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard/cliente", response_class=HTMLResponse)
async def dashboard_cliente(request: Request):
    return templates.TemplateResponse("dashboard_cliente.html", {"request": request})

@app.get("/dashboard/motoboy", response_class=HTMLResponse)
async def dashboard_motoboy(request: Request):
    return templates.TemplateResponse("dashboard_motoboy.html", {"request": request})

@app.get("/dashboard/central", response_class=HTMLResponse)
async def dashboard_central(request: Request):
    return templates.TemplateResponse("dashboard_central.html", {"request": request})

# CORS (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production to your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory socket manager
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}  # room -> websockets

    async def connect(self, room: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(room, []).append(ws)
        logger.info(f"WS connect room={room} active={len(self.active[room])}")

    def disconnect(self, room: str, ws: WebSocket):
        if room in self.active and ws in self.active[room]:
            self.active[room].remove(ws)
            logger.info(f"WS disconnect room={room} remaining={len(self.active[room])}")
            if not self.active[room]:
                del self.active[room]

    async def broadcast(self, room: str, message: Dict[str, Any]):
        if room not in self.active: return
        text = json.dumps(message, default=str)
        to_remove = []
        for ws in list(self.active[room]):
            try:
                await ws.send_text(text)
            except Exception as e:
                logger.warning("WS send failed, scheduling remove: %s", e)
                to_remove.append(ws)
        for r in to_remove:
            self.disconnect(room, r)

    async def send_to_all(self, message: Dict[str, Any]):
        text = json.dumps(message, default=str)
        for room, sockets in list(self.active.items()):
            for ws in list(sockets):
                try:
                    await ws.send_text(text)
                except Exception:
                    self.disconnect(room, ws)

manager = ConnectionManager()

# Schumacher IA controller
class SchumacherController:
    def __init__(self):
        self.assume_mode = False  # whether Schumacher IA is actively "assumming" chats
        self.model = OLLAMA_MODEL
        self.client = httpx.AsyncClient(timeout=30.0)

    async def call_model(self, prompt: str) -> str:
        """
        Call Ollama local API to generate a text response.
        Uses POST /api/generate or /v1 depending on Ollama version.
        We'll try common endpoints robustly.
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "max_tokens": 512
        }
        # Try Ollama v1-style /v1/complete or /v1/generate; fallback to /api/generate
        endpoints = [
            f"{OLLAMA_HOST}/v1/generate",
            f"{OLLAMA_HOST}/api/generate",
            f"{OLLAMA_HOST}/v1/complete",
            f"{OLLAMA_HOST}/api/complete"
        ]
        last_exc = None
        for endpoint in endpoints:
            try:
                r = await self.client.post(endpoint, json=payload)
                if r.status_code == 200:
                    j = r.json()
                    # try common shapes
                    if isinstance(j, dict):
                        # Ollama /v1/generate returns {"choices":[{"content":"..."}], ...}
                        if "choices" in j and isinstance(j["choices"], list) and j["choices"]:
                            c = j["choices"][0]
                            if isinstance(c, dict) and "content" in c:
                                return c["content"]
                            if isinstance(c, dict) and "text" in c:
                                return c["text"]
                        if "text" in j:
                            return j["text"]
                        if "result" in j:
                            return str(j["result"])
                        # last resort:
                        return json.dumps(j)[:2000]
                else:
                    last_exc = f"{endpoint} -> {r.status_code} {r.text[:400]}"
            except Exception as e:
                last_exc = str(e)
        logger.error("Ollama call failed: %s", last_exc)
        return "Erro interno: Schumacher não pôde responder no momento."

SCH = SchumacherController()

# DB init
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS pedidos (
                id TEXT PRIMARY KEY,
                cliente TEXT,
                coleta TEXT,
                entrega TEXT,
                obs TEXT,
                created_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                room TEXT,
                sender TEXT,
                text TEXT,
                meta JSON,
                ts TEXT
            )
        """)
        await db.commit()

@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("Backend started. DB at %s", DB_PATH)

# ---------------- REST endpoints ----------------

@app.post("/api/pedido")
async def create_pedido(payload: Dict[str, Any]):
    """
    Create a new pedido (order). Returns id.
    Frontend uses this for new jobs.
    """
    pid = str(int(time.time()*1000))
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO pedidos (id, cliente, coleta, entrega, obs, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (pid, payload.get("cliente"), payload.get("coleta"), payload.get("entrega"), payload.get("obs"), now)
        )
        await db.commit()
    logger.info("Pedido created %s by %s", pid, payload.get("cliente"))

    # Broadcast pedido data to all connected WebSockets
    pedido_data = {
        "id": pid,
        "cliente": payload.get("cliente"),
        "coleta": payload.get("coleta"),
        "entrega": payload.get("entrega"),
        "obs": payload.get("obs"),
        "created_at": now
    }
    await manager.send_to_all({
        "type": "new_pedido",
        "payload": pedido_data,
        "ts": now
    })

    return {"id": pid}

@app.post("/api/upload")
async def upload_live_doc(order_id: str = Form(...), motoboy: str = Form(...), file: UploadFile = File(...), lat: Optional[str] = Form(None), lon: Optional[str] = Form(None)):
    """
    Upload Live Document (photo). Saves file and returns path metadata.
    """
    now = datetime.utcnow().isoformat()
    filename = f"{order_id}_{motoboy}_{int(time.time())}_{uuid.uuid4().hex[:8]}_{file.filename}"
    dest_path = os.path.join(UPLOAD_DIR, filename)
    # save file
    async with aiofiles.open(dest_path, "wb") as out:
        content = await file.read()
        await out.write(content)
    meta = {"order_id": order_id, "motoboy": motoboy, "path": dest_path, "lat": lat, "lon": lon, "ts": now}
    # Optionally: store a message to DB
    mid = uuid.uuid4().hex
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT INTO messages (id, room, sender, text, meta, ts) VALUES (?, ?, ?, ?, ?, ?)",
                         (mid, order_id, motoboy, f"LiveDoc uploaded: {filename}", json.dumps(meta), now))
        await db.commit()
    logger.info("Upload saved %s (order=%s)", dest_path, order_id)
    # broadcast to room (order_id)
    await manager.broadcast(order_id, {"type": "live_doc_uploaded", "payload": meta, "ts": now})
    return JSONResponse({"ok": True, "path": dest_path})

@app.get("/api/docs/cliente/{cliente_id}")
async def download_docs_cliente(cliente_id: str):
    """
    Return a zip of docs for this client (simple implementation: returns matched files).
    In production you would create a zip on-the-fly or use pre-generated archives.
    """
    # naive: find files containing cliente_id in filename
    files = [f for f in os.listdir(UPLOAD_DIR) if cliente_id in f]
    if not files:
        raise HTTPException(status_code=404, detail="Nenhum Live Docs disponível.")
    # if only one file, return it; else, zip them (for speed we return first file)
    first = os.path.join(UPLOAD_DIR, files[0])
    return FileResponse(first, media_type="application/octet-stream", filename=os.path.basename(first))

# Admin action: toggle Schumacher assume mode
def verify_admin_token(req: Request):
    token = req.headers.get("X-Admin-Token") or req.query_params.get("admin_token")
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@app.post("/api/admin/thor")
async def admin_thor(action: str, req: Request):
    """
    Admin-only control endpoint.
    action = "on" or "off"
    """
    verify_admin_token(req)
    if action not in ("on", "off"):
        raise HTTPException(status_code=400, detail="invalid action")
    SCH.assume_mode = (action == "on")
    logger.info("Admin toggled SCHUMACHER assume_mode=%s", SCH.assume_mode)
    # Notify all
    await manager.send_to_all({"type": "schumacher_mode", "payload": {"assume": SCH.assume_mode}, "ts": datetime.utcnow().isoformat()})
    return {"ok": True, "assume": SCH.assume_mode}

# ---------------- WebSocket chat ----------------

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    """
    room: typically order_id for order chat or 'central' for central / admin chat.
    Clients open ws to /ws/{room} (motoboy, cliente, central use same room name to communicate).
    """
    await manager.connect(room, websocket)
    try:
        # Announce presence to others
        await manager.broadcast(room, {"type": "system", "payload": f"join:{room}", "ts": datetime.utcnow().isoformat()})
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except Exception:
                # allow plain text fallback
                msg = {"type": "chat", "payload": {"from": "unknown", "text": data}}
            # persist message
            mid = uuid.uuid4().hex
            now = datetime.utcnow().isoformat()
            room_name = room
            sender = msg.get("payload", {}).get("from", "unknown")
            text = msg.get("payload", {}).get("text", msg.get("text", str(msg)))
            meta = msg.get("payload", {}).get("meta", {})
            async with aiosqlite.connect(DB_PATH) as db:
                await db.execute("INSERT INTO messages (id, room, sender, text, meta, ts) VALUES (?, ?, ?, ?, ?, ?)",
                                 (mid, room_name, sender, text, json.dumps(meta), now))
                await db.commit()
            # broadcast to room
            broadcast_payload = {"type": "chat", "payload": {"from": sender, "text": text, "meta": meta}, "ts": now}
            await manager.broadcast(room, broadcast_payload)
            # if admin command present and authorized -> toggle SCH
            if isinstance(text, str) and text.strip().lower().startswith("/thor "):
                cmd = text.strip().lower().split()
                if len(cmd) >= 2:
                    if cmd[1] in ("on","off"):
                        # Only allow if sender is admin (simple check: include admin token in meta or room 'central' with token)
                        admin_token = meta.get("admin_token") or ""
                        if admin_token == ADMIN_TOKEN or room_name == "central":
                            SCH.assume_mode = (cmd[1] == "on")
                            await manager.send_to_all({"type":"schumacher_mode","payload":{"assume":SCH.assume_mode,"by":sender}})
                            logger.info("Thor command in chat: assume_mode=%s by=%s", SCH.assume_mode, sender)
                        else:
                            await manager.broadcast(room, {"type":"system","payload":"/thor denied: not admin","ts":now})
            # If SCH in assume mode, the IA should respond to chats (but only admin can enable)
            if SCH.assume_mode:
                # prepare prompt (concise)
                prompt = f"Room: {room_name}\nSender: {sender}\nMessage: {text}\n\nRespond as THOR assistant for Guriri Express. Keep short, give actions or confirmations only."
                # schedule model call in background (non-blocking)
                asyncio.create_task(handle_schumacher_response(room_name, sender, text, prompt))
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
        await manager.send_to_all({"type":"system", "payload": f"left:{room}", "ts": datetime.utcnow().isoformat()})
    except Exception as e:
        logger.exception("ws main loop error: %s", e)
        manager.disconnect(room, websocket)

async def handle_schumacher_response(room: str, sender: str, text: str, prompt: str):
    try:
        # call model
        resp = await SCH.call_model(prompt)
        now = datetime.utcnow().isoformat()
        # persist
        mid = uuid.uuid4().hex
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("INSERT INTO messages (id, room, sender, text, meta, ts) VALUES (?, ?, ?, ?, ?, ?)",
                             (mid, room, "THOR", resp, json.dumps({"source":"schumacher"}), now))
            await db.commit()
        # broadcast
        await manager.broadcast(room, {"type":"chat","payload":{"from":"THOR","text":resp},"ts":now})
    except Exception as e:
        logger.exception("schumacher response failed: %s", e)

# ---------------- Admin utilities ----------------

@app.get("/api/debug/messages/{room}")
async def get_messages(room: str, limit: int = 200):
    rows = []
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT id, room, sender, text, meta, ts FROM messages WHERE room = ? ORDER BY ts DESC LIMIT ?", (room, limit))
        rows = await cur.fetchall()
    out = [{"id":r[0],"room":r[1],"sender":r[2],"text":r[3],"meta":json.loads(r[4]) if r[4] else None,"ts":r[5]} for r in rows]
    return out

@app.get("/api/health")
async def health():
    return {"ok": True, "schumacher_assume": SCH.assume_mode, "ollama_model": SCH.model}

# ---------------- Run note ----------------
# Start with: uvicorn main:app --host 0.0.0.0 --port 8000
# In Docker just expose 8000 to host as you already have configured.



# # main.py
# # Guriri Express backend - FastAPI + WebSocket + Ollama (Schumacher IA) integration
# # SQLite persistence, file uploads, simple admin token security for /thor commands.
# #
# # Requirements (pip): fastapi uvicorn[standard] httpx aiofiles python-multipart databases aiosqlite
# # (requirements.txt provided separately)
# #
# # Paths used:
# #  - DB: /opt/guriri-prod/data/guriri.db
# #  - UPLOADS: /opt/guriri-prod/uploads/
# #  - LOGS: /opt/guriri-prod/logs/

# import os
# import json
# import time
# import uuid
# import logging
# import asyncio
# from typing import Dict, Any, List, Optional
# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request, HTTPException, Depends
# from fastapi.responses import JSONResponse, FileResponse
# from fastapi.middleware.cors import CORSMiddleware
# import aiosqlite
# import aiofiles
# import httpx
# from datetime import datetime

# ## --- CONFIG (prefer env vars) ---
# DATA_DIR = os.getenv("GURIRI_DATA_DIR", "/opt/guriri-prod")
# DB_PATH = os.path.join(DATA_DIR, "data", "guriri.db")
# UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
# LOG_DIR = os.path.join(DATA_DIR, "logs")

# OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")  # Ollama HTTP API base
# OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "dolphin-mistral:7b-v2.6-dpo-laser-q8_0")
# ADMIN_TOKEN = os.getenv("GURIRI_ADMIN_TOKEN", "changeme_admin_token")  # set strong token in env

# # Ensure dirs exist
# os.makedirs(os.path.join(DATA_DIR, "data"), exist_ok=True)
# os.makedirs(UPLOAD_DIR, exist_ok=True)
# os.makedirs(LOG_DIR, exist_ok=True)

# # Logging
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s %(levelname)s %(message)s",
#     handlers=[
#         logging.FileHandler(os.path.join(LOG_DIR, "backend.log")),
#         logging.StreamHandler()
#     ]
# )
# logger = logging.getLogger("guriri-backend")

# app = FastAPI(title="Guriri Express Backend")

# # Rotas de páginas HTML
# from fastapi.responses import HTMLResponse
# from fastapi.templating import Jinja2Templates

# templates = Jinja2Templates(directory="templates")

# @app.get("/", response_class=HTMLResponse)
# async def index(request: Request):
#     return templates.TemplateResponse("index.html", {"request": request})

# @app.get("/dashboard/cliente", response_class=HTMLResponse)
# async def dashboard_cliente(request: Request):
#     return templates.TemplateResponse("dashboard_cliente.html", {"request": request})

# @app.get("/dashboard/motoboy", response_class=HTMLResponse)
# async def dashboard_motoboy(request: Request):
#     return templates.TemplateResponse("dashboard_motoboy.html", {"request": request})

# @app.get("/dashboard/central", response_class=HTMLResponse)
# async def dashboard_central(request: Request):
#     return templates.TemplateResponse("dashboard_central.html", {"request": request})

# # CORS (adjust origins in production)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # restrict in production to your domains
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # In-memory socket manager
# class ConnectionManager:
#     def __init__(self):
#         self.active: Dict[str, List[WebSocket]] = {}  # room -> websockets

#     async def connect(self, room: str, ws: WebSocket):
#         await ws.accept()
#         self.active.setdefault(room, []).append(ws)
#         logger.info(f"WS connect room={room} active={len(self.active[room])}")

#     def disconnect(self, room: str, ws: WebSocket):
#         if room in self.active and ws in self.active[room]:
#             self.active[room].remove(ws)
#             logger.info(f"WS disconnect room={room} remaining={len(self.active[room])}")
#             if not self.active[room]:
#                 del self.active[room]

#     async def broadcast(self, room: str, message: Dict[str, Any]):
#         if room not in self.active: return
#         text = json.dumps(message, default=str)
#         to_remove = []
#         for ws in list(self.active[room]):
#             try:
#                 await ws.send_text(text)
#             except Exception as e:
#                 logger.warning("WS send failed, scheduling remove: %s", e)
#                 to_remove.append(ws)
#         for r in to_remove:
#             self.disconnect(room, r)

#     async def send_to_all(self, message: Dict[str, Any]):
#         text = json.dumps(message, default=str)
#         for room, sockets in list(self.active.items()):
#             for ws in list(sockets):
#                 try:
#                     await ws.send_text(text)
#                 except Exception:
#                     self.disconnect(room, ws)

# manager = ConnectionManager()

# # Schumacher IA controller
# class SchumacherController:
#     def __init__(self):
#         self.assume_mode = False  # whether Schumacher IA is actively "assumming" chats
#         self.model = OLLAMA_MODEL
#         self.client = httpx.AsyncClient(timeout=30.0)

#     async def call_model(self, prompt: str) -> str:
#         """
#         Call Ollama local API to generate a text response.
#         Uses POST /api/generate or /v1 depending on Ollama version.
#         We'll try common endpoints robustly.
#         """
#         payload = {
#             "model": self.model,
#             "prompt": prompt,
#             "max_tokens": 512
#         }
#         # Try Ollama v1-style /v1/complete or /v1/generate; fallback to /api/generate
#         endpoints = [
#             f"{OLLAMA_HOST}/v1/generate",
#             f"{OLLAMA_HOST}/api/generate",
#             f"{OLLAMA_HOST}/v1/complete",
#             f"{OLLAMA_HOST}/api/complete"
#         ]
#         last_exc = None
#         for endpoint in endpoints:
#             try:
#                 r = await self.client.post(endpoint, json=payload)
#                 if r.status_code == 200:
#                     j = r.json()
#                     # try common shapes
#                     if isinstance(j, dict):
#                         # Ollama /v1/generate returns {"choices":[{"content":"..."}], ...}
#                         if "choices" in j and isinstance(j["choices"], list) and j["choices"]:
#                             c = j["choices"][0]
#                             if isinstance(c, dict) and "content" in c:
#                                 return c["content"]
#                             if isinstance(c, dict) and "text" in c:
#                                 return c["text"]
#                         if "text" in j:
#                             return j["text"]
#                         if "result" in j:
#                             return str(j["result"])
#                         # last resort:
#                         return json.dumps(j)[:2000]
#                 else:
#                     last_exc = f"{endpoint} -> {r.status_code} {r.text[:400]}"
#             except Exception as e:
#                 last_exc = str(e)
#         logger.error("Ollama call failed: %s", last_exc)
#         return "Erro interno: Schumacher não pôde responder no momento."

# SCH = SchumacherController()

# # DB init
# async def init_db():
#     async with aiosqlite.connect(DB_PATH) as db:
#         await db.execute("""
#             CREATE TABLE IF NOT EXISTS pedidos (
#                 id TEXT PRIMARY KEY,
#                 cliente TEXT,
#                 coleta TEXT,
#                 entrega TEXT,
#                 obs TEXT,
#                 created_at TEXT
#             )
#         """)
#         await db.execute("""
#             CREATE TABLE IF NOT EXISTS messages (
#                 id TEXT PRIMARY KEY,
#                 room TEXT,
#                 sender TEXT,
#                 text TEXT,
#                 meta JSON,
#                 ts TEXT
#             )
#         """)
#         await db.commit()

# @app.on_event("startup")
# async def startup():
#     await init_db()
#     logger.info("Backend started. DB at %s", DB_PATH)

# # ---------------- REST endpoints ----------------

# @app.post("/api/pedido")
# async def create_pedido(payload: Dict[str, Any]):
#     """
#     Create a new pedido (order). Returns id.
#     Frontend uses this for new jobs.
#     """
#     pid = str(int(time.time()*1000))
#     async with aiosqlite.connect(DB_PATH) as db:
#         await db.execute(
#             "INSERT INTO pedidos (id, cliente, coleta, entrega, obs, created_at) VALUES (?, ?, ?, ?, ?, ?)",
#             (pid, payload.get("cliente"), payload.get("coleta"), payload.get("entrega"), payload.get("obs"), datetime.utcnow().isoformat())
#         )
#         await db.commit()
#     logger.info("Pedido created %s by %s", pid, payload.get("cliente"))
#     return {"id": pid}

# @app.post("/api/upload")
# async def upload_live_doc(order_id: str = Form(...), motoboy: str = Form(...), file: UploadFile = File(...), lat: Optional[str] = Form(None), lon: Optional[str] = Form(None)):
#     """
#     Upload Live Document (photo). Saves file and returns path metadata.
#     """
#     now = datetime.utcnow().isoformat()
#     filename = f"{order_id}_{motoboy}_{int(time.time())}_{uuid.uuid4().hex[:8]}_{file.filename}"
#     dest_path = os.path.join(UPLOAD_DIR, filename)
#     # save file
#     async with aiofiles.open(dest_path, "wb") as out:
#         content = await file.read()
#         await out.write(content)
#     meta = {"order_id": order_id, "motoboy": motoboy, "path": dest_path, "lat": lat, "lon": lon, "ts": now}
#     # Optionally: store a message to DB
#     mid = uuid.uuid4().hex
#     async with aiosqlite.connect(DB_PATH) as db:
#         await db.execute("INSERT INTO messages (id, room, sender, text, meta, ts) VALUES (?, ?, ?, ?, ?, ?)",
#                          (mid, order_id, motoboy, f"LiveDoc uploaded: {filename}", json.dumps(meta), now))
#         await db.commit()
#     logger.info("Upload saved %s (order=%s)", dest_path, order_id)
#     # broadcast to room (order_id)
#     await manager.broadcast(order_id, {"type": "live_doc_uploaded", "payload": meta, "ts": now})
#     return JSONResponse({"ok": True, "path": dest_path})

# @app.get("/api/docs/cliente/{cliente_id}")
# async def download_docs_cliente(cliente_id: str):
#     """
#     Return a zip of docs for this client (simple implementation: returns matched files).
#     In production you would create a zip on-the-fly or use pre-generated archives.
#     """
#     # naive: find files containing cliente_id in filename
#     files = [f for f in os.listdir(UPLOAD_DIR) if cliente_id in f]
#     if not files:
#         raise HTTPException(status_code=404, detail="Nenhum Live Docs disponível.")
#     # if only one file, return it; else, zip them (for speed we return first file)
#     first = os.path.join(UPLOAD_DIR, files[0])
#     return FileResponse(first, media_type="application/octet-stream", filename=os.path.basename(first))

# # Admin action: toggle Schumacher assume mode
# def verify_admin_token(req: Request):
#     token = req.headers.get("X-Admin-Token") or req.query_params.get("admin_token")
#     if not token or token != ADMIN_TOKEN:
#         raise HTTPException(status_code=401, detail="Unauthorized")
#     return True

# @app.post("/api/admin/thor")
# async def admin_thor(action: str, req: Request):
#     """
#     Admin-only control endpoint.
#     action = "on" or "off"
#     """
#     verify_admin_token(req)
#     if action not in ("on", "off"):
#         raise HTTPException(status_code=400, detail="invalid action")
#     SCH.assume_mode = (action == "on")
#     logger.info("Admin toggled SCHUMACHER assume_mode=%s", SCH.assume_mode)
#     # Notify all
#     await manager.send_to_all({"type": "schumacher_mode", "payload": {"assume": SCH.assume_mode}, "ts": datetime.utcnow().isoformat()})
#     return {"ok": True, "assume": SCH.assume_mode}

# # ---------------- WebSocket chat ----------------

# @app.websocket("/ws/{room}")
# async def websocket_endpoint(websocket: WebSocket, room: str):
#     """
#     room: typically order_id for order chat or 'central' for central / admin chat.
#     Clients open ws to /ws/{room} (motoboy, cliente, central use same room name to communicate).
#     """
#     await manager.connect(room, websocket)
#     try:
#         # Announce presence to others
#         await manager.broadcast(room, {"type": "system", "payload": f"join:{room}", "ts": datetime.utcnow().isoformat()})
#         while True:
#             data = await websocket.receive_text()
#             try:
#                 msg = json.loads(data)
#             except Exception:
#                 # allow plain text fallback
#                 msg = {"type": "chat", "payload": {"from": "unknown", "text": data}}
#             # persist message
#             mid = uuid.uuid4().hex
#             now = datetime.utcnow().isoformat()
#             room_name = room
#             sender = msg.get("payload", {}).get("from", "unknown")
#             text = msg.get("payload", {}).get("text", msg.get("text", str(msg)))
#             meta = msg.get("payload", {}).get("meta", {})
#             async with aiosqlite.connect(DB_PATH) as db:
#                 await db.execute("INSERT INTO messages (id, room, sender, text, meta, ts) VALUES (?, ?, ?, ?, ?, ?)",
#                                  (mid, room_name, sender, text, json.dumps(meta), now))
#                 await db.commit()
#             # broadcast to room
#             broadcast_payload = {"type": "chat", "payload": {"from": sender, "text": text, "meta": meta}, "ts": now}
#             await manager.broadcast(room, broadcast_payload)
#             # if admin command present and authorized -> toggle SCH
#             if isinstance(text, str) and text.strip().lower().startswith("/thor "):
#                 cmd = text.strip().lower().split()
#                 if len(cmd) >= 2:
#                     if cmd[1] in ("on","off"):
#                         # Only allow if sender is admin (simple check: include admin token in meta or room 'central' with token)
#                         admin_token = meta.get("admin_token") or ""
#                         if admin_token == ADMIN_TOKEN or room_name == "central":
#                             SCH.assume_mode = (cmd[1] == "on")
#                             await manager.send_to_all({"type":"schumacher_mode","payload":{"assume":SCH.assume_mode,"by":sender}})
#                             logger.info("Thor command in chat: assume_mode=%s by=%s", SCH.assume_mode, sender)
#                         else:
#                             await manager.broadcast(room, {"type":"system","payload":"/thor denied: not admin","ts":now})
#             # If SCH in assume mode, the IA should respond to chats (but only admin can enable)
#             if SCH.assume_mode:
#                 # prepare prompt (concise)
#                 prompt = f"Room: {room_name}\nSender: {sender}\nMessage: {text}\n\nRespond as THOR assistant for Guriri Express. Keep short, give actions or confirmations only."
#                 # schedule model call in background (non-blocking)
#                 asyncio.create_task(handle_schumacher_response(room_name, sender, text, prompt))
#     except WebSocketDisconnect:
#         manager.disconnect(room, websocket)
#         await manager.send_to_all({"type":"system", "payload": f"left:{room}", "ts": datetime.utcnow().isoformat()})
#     except Exception as e:
#         logger.exception("ws main loop error: %s", e)
#         manager.disconnect(room, websocket)

# async def handle_schumacher_response(room: str, sender: str, text: str, prompt: str):
#     try:
#         # call model
#         resp = await SCH.call_model(prompt)
#         now = datetime.utcnow().isoformat()
#         # persist
#         mid = uuid.uuid4().hex
#         async with aiosqlite.connect(DB_PATH) as db:
#             await db.execute("INSERT INTO messages (id, room, sender, text, meta, ts) VALUES (?, ?, ?, ?, ?, ?)",
#                              (mid, room, "THOR", resp, json.dumps({"source":"schumacher"}), now))
#             await db.commit()
#         # broadcast
#         await manager.broadcast(room, {"type":"chat","payload":{"from":"THOR","text":resp},"ts":now})
#     except Exception as e:
#         logger.exception("schumacher response failed: %s", e)

# # ---------------- Admin utilities ----------------

# @app.get("/api/debug/messages/{room}")
# async def get_messages(room: str, limit: int = 200):
#     rows = []
#     async with aiosqlite.connect(DB_PATH) as db:
#         cur = await db.execute("SELECT id, room, sender, text, meta, ts FROM messages WHERE room = ? ORDER BY ts DESC LIMIT ?", (room, limit))
#         rows = await cur.fetchall()
#     out = [{"id":r[0],"room":r[1],"sender":r[2],"text":r[3],"meta":json.loads(r[4]) if r[4] else None,"ts":r[5]} for r in rows]
#     return out

# @app.get("/api/health")
# async def health():
#     return {"ok": True, "schumacher_assume": SCH.assume_mode, "ollama_model": SCH.model}

# # ---------------- Run note ----------------
# # Start with: uvicorn main:app --host 0.0.0.0 --port 8000
# # In Docker just expose 8000 to host as you already have configured.