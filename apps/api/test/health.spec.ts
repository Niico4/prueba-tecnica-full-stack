import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupApp } from "../src/config/setup-app.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { HealthController } from "../src/modules/health/health.controller.js";
import { HealthService } from "../src/modules/health/health.service.js";

describe("Health HTTP contract with isolated database double", () => {
  let app: INestApplication;
  const query = vi.fn();
  beforeEach(async () => {
    query.mockReset().mockResolvedValue([{ "?column?": 1 }]);
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { $queryRaw: query } },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            CORS_ORIGINS: ["http://localhost:5173"],
          }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });
  it("returns 503 without exposing database details", async () => {
    query.mockRejectedValue(
      new Error("postgresql://private:secret@internal/db"),
    );
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(503, { status: "error", database: "down" });
  });
  it("allows only configured CORS origins", async () => {
    await request(app.getHttpServer())
      .get("/api/health")
      .set("Origin", "http://localhost:5173")
      .expect("Access-Control-Allow-Origin", "http://localhost:5173");
    const denied = await request(app.getHttpServer())
      .get("/api/health")
      .set("Origin", "https://untrusted.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
