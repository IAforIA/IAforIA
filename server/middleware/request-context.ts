import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Assigns a request-scoped ID and exposes it via header for traceability
export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
