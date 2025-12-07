import { Router } from "express";
import { db } from "../storage/db.js";

export function buildHealthRouter() {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/ready", async (_req, res) => {
    try {
      await db.execute("select 1");
      res.json({ status: "ready" });
    } catch (err) {
      res.status(503).json({ status: "degraded", error: (err as Error).message });
    }
  });

  return router;
}
