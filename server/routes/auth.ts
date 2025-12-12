import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { storage } from "../storage.ts";
import { clientOnboardingSchema, motoboyOnboardingSchema } from "@shared/contracts";
import { authenticateToken, requireRole } from "../middleware/auth.ts";

const CLIENT_PROFILE_NOT_FOUND = "CLIENT_PROFILE_NOT_FOUND";

function ensureJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required for security");
  }
  return process.env.JWT_SECRET;
}

function createLimiters() {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { error: "Muitas tentativas de cadastro. Aguarde alguns minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return { loginLimiter, registerLimiter };
}

export function buildAuthRouter() {
  const router = Router();
  const JWT_SECRET = ensureJwtSecret();
  const { loginLimiter, registerLimiter } = createLimiters();

  router.post("/auth/register", registerLimiter, async (req, res) => {
    try {
      const payload = clientOnboardingSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(payload.password, 10);
      const { password: _password, ...clientPayload } = payload;
      const profile = await storage.createClientWithUser(clientPayload, passwordHash);
      const token = jwt.sign({ id: profile.id, role: "client" }, JWT_SECRET, { expiresIn: "24h" });
      res.status(201).json({ access_token: token, profile });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      if (error instanceof Error && error.message === "EMAIL_IN_USE") {
        return res.status(409).json({ error: "Email já cadastrado" });
      }
      if (error instanceof Error && error.message === "DOCUMENT_IN_USE") {
        return res.status(409).json({ error: "Documento já cadastrado" });
      }
      console.error("💥 Erro no registro:", error);
      const errorMessage = process.env.NODE_ENV === "production"
        ? "Erro interno ao registrar usuário"
        : (error instanceof Error ? error.message : "Erro desconhecido");
      res.status(500).json({ error: errorMessage });
    }
  });

  // ROTA: Registro de novo motoboy/entregador
  router.post("/auth/register/motoboy", registerLimiter, async (req, res) => {
    try {
      const payload = motoboyOnboardingSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(payload.password, 10);
      const { password: _password, acceptTerms: _acceptTerms, ...motoboyPayload } = payload;
      const profile = await storage.createMotoboyWithUser(motoboyPayload, passwordHash);
      const token = jwt.sign({ id: profile.id, role: "motoboy" }, JWT_SECRET, { expiresIn: "24h" });
      res.status(201).json({ 
        access_token: token, 
        id: profile.id,
        name: profile.name,
        role: "motoboy",
        phone: profile.phone,
        email: profile.email,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      if (error instanceof Error && error.message === "EMAIL_IN_USE") {
        return res.status(409).json({ error: "Email já cadastrado" });
      }
      if (error instanceof Error && error.message === "CPF_IN_USE") {
        return res.status(409).json({ error: "CPF já cadastrado" });
      }
      console.error("💥 Erro no registro de motoboy:", error);
      const errorMessage = process.env.NODE_ENV === "production"
        ? "Erro interno ao registrar entregador"
        : (error instanceof Error ? error.message : "Erro desconhecido");
      res.status(500).json({ error: errorMessage });
    }
  });

  router.post("/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("🔐 Tentativa de login:", { emailReceived: email, emailType: typeof email, passwordLength: password?.length });
      const user = await storage.getUserByEmail(email);
      if (user) {
        console.log("👤 Usuário encontrado:", { id: user.id, email: user.email, role: user.role });
      } else {
        console.log("👤 Usuário NÃO encontrado para o email:", email);
      }
      if (!user) {
        console.log("❌ Login falhou: usuário não encontrado");
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      console.log("🔑 Senha válida:", validPassword);
      if (!validPassword) {
        console.log("❌ Login falhou: senha inválida");
        const testHash = await bcrypt.hash(password, 10);
        console.log("🔍 Teste de hash:", { inputPassword: password, generatedHash: testHash });
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "24h" });
      console.log("✅ Login bem-sucedido:", { userId: user.id, role: user.role });
      res.json({ access_token: token, id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email });
    } catch (error) {
      console.error("💥 Erro no login:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  router.get("/me/profile", authenticateToken, requireRole("client"), async (req, res) => {
    try {
      const profile = await storage.getClientProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: CLIENT_PROFILE_NOT_FOUND });
      }
      res.json(profile);
    } catch (error) {
      console.error("💥 Erro ao carregar perfil:", error);
      res.status(500).json({ error: "Erro ao carregar perfil do cliente" });
    }
  });

  return router;
}
