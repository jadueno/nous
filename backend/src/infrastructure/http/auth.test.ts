import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerAuth } from "./auth.js";

function buildTestApp(token: string | undefined) {
  const app = Fastify({ logger: false });
  registerAuth(app, token);
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/protegido", async () => ({ ok: true }));
  return app;
}

describe("registerAuth", () => {
  it("sin token configurado, no exige ninguna cabecera (uso personal sin fricción)", async () => {
    const app = buildTestApp(undefined);
    const res = await app.inject({ method: "GET", url: "/protegido" });
    expect(res.statusCode).toBe(200);
  });

  it("con token configurado, rechaza peticiones sin Authorization", async () => {
    const app = buildTestApp("secreto");
    const res = await app.inject({ method: "GET", url: "/protegido" });
    expect(res.statusCode).toBe(401);
  });

  it("con token configurado, rechaza un token incorrecto", async () => {
    const app = buildTestApp("secreto");
    const res = await app.inject({
      method: "GET",
      url: "/protegido",
      headers: { authorization: "Bearer incorrecto" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("con token configurado, acepta el token correcto", async () => {
    const app = buildTestApp("secreto");
    const res = await app.inject({
      method: "GET",
      url: "/protegido",
      headers: { authorization: "Bearer secreto" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("/health nunca exige token, ni con auth activada", async () => {
    const app = buildTestApp("secreto");
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });
});
