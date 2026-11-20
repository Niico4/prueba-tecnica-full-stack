import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupApp } from "../src/config/setup-app.js";
import { PrismaService } from "../src/database/prisma.service.js";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || new URL(testUrl).pathname !== "/valorant_test") {
  throw new Error(
    "TEST_DATABASE_URL must explicitly target the isolated valorant_test database",
  );
}
process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-only-at-least-32-bytes-long";
process.env.CORS_ORIGINS = "http://localhost:5173";
// Import after setting the isolated URL: ConfigModule evaluates during module loading.
const { AppModule } = await import("../src/app.module.js");

describe("Health with real PostgreSQL and full application module", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it("returns readiness after an actual PostgreSQL query", async () => {
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(200, { status: "ok", database: "up" });
  });
  it("preserves SQL-only integrity constraints and required color arrays", async () => {
    const prisma = app.get(PrismaService);
    const checks = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE contype = 'c' AND connamespace = 'public'::regnamespace
    `;
    expect(checks.map((check) => check.conname).sort()).toEqual([
      "users_email_normalized",
      "users_username_normalized",
      "weapon_damage_ranges_valid",
      "weapons_cost_nonnegative",
    ]);
    const columns = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'agents'
        AND column_name = 'background_gradient_colors'
    `;
    expect(columns).toEqual([{ is_nullable: "NO" }]);
  });
});
