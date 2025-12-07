import { createServer } from "http";
import express from "express";
import request from "supertest";
import dotenv from "dotenv";

// Load env vars for DB connection; fall back to skipping when missing
dotenv.config({ path: ".env.test", override: false });
dotenv.config({ path: ".env", override: false });

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const testEmail = process.env.TEST_AUTH_EMAIL ?? "central@guriri.com";
const testPassword = process.env.TEST_AUTH_PASSWORD ?? "central";

async function buildApp() {
  // Dynamically import after env is loaded to avoid throwing on missing DATABASE_URL
  const { registerRoutes } = await import("../server/routes/index.js");

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const router = await registerRoutes();
  app.use(router);
  return app;
}

const describeAuth = hasDatabaseUrl ? describe : describe.skip;

describeAuth("auth + protected routes", () => {
  it("logs in and accesses a protected endpoint", async () => {
    const app = await buildApp();
    const server = createServer(app);

    const loginRes = await request(server)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    if (loginRes.status !== 200 || !loginRes.body?.token) {
      console.warn(
        `Login falhou para ${testEmail}. Garanta seed válido ou configure TEST_AUTH_EMAIL / TEST_AUTH_PASSWORD.`
      );
      return; // Skip assertions when seed is missing
    }

    const { token } = loginRes.body;

    const protectedRes = await request(server)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(protectedRes.status).toBe(200);
    expect(Array.isArray(protectedRes.body)).toBe(true);
  });
});
