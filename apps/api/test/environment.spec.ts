import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../src/config/environment.js";

const valid = {
  JWT_SECRET: "test-secret-only-at-least-32-bytes-long",
  DATABASE_URL: "postgresql://test:test@localhost:5433/valorant_test",
};
describe("Environment validation", () => {
  it("parses defaults and comma-separated origins", () => {
    expect(
      validateEnvironment({
        ...valid,
        CORS_ORIGINS: "http://localhost:5173, https://example.com",
      }),
    ).toMatchObject({
      PORT: 3000,
      NODE_ENV: "development",
      CORS_ORIGINS: ["http://localhost:5173", "https://example.com"],
    });
  });
  it.each([0, 65536, 1.5, "invalid"])("rejects invalid port %s", (PORT) => {
    expect(() => validateEnvironment({ ...valid, PORT })).toThrow("PORT");
  });
  it.each(["*", "https://example.com/path", "file:///tmp"])(
    "rejects invalid origin %s",
    (CORS_ORIGINS) => {
      expect(() => validateEnvironment({ ...valid, CORS_ORIGINS })).toThrow(
        "CORS_ORIGINS",
      );
    },
  );
  it("rejects missing database configuration without leaking input", () => {
    expect(() => validateEnvironment({})).toThrow("DATABASE_URL is required");
    expect(() => validateEnvironment({ DATABASE_URL: "secret" })).toThrow(
      "DATABASE_URL must be a PostgreSQL URL",
    );
  });
  it("rejects unknown environment", () => {
    expect(() =>
      validateEnvironment({ ...valid, NODE_ENV: "invalid" }),
    ).toThrow("NODE_ENV");
  });
  it.each([undefined, "", "short", " ".repeat(40)])(
    "rejects invalid JWT secrets without exposing them",
    (JWT_SECRET) => {
      expect(() => validateEnvironment({ ...valid, JWT_SECRET })).toThrow(
        "JWT_SECRET must",
      );
    },
  );
  it.each([0, 59, 86401, "1h", 60.5])(
    "rejects invalid token lifetime %s",
    (JWT_EXPIRES_IN_SECONDS) => {
      expect(() =>
        validateEnvironment({ ...valid, JWT_EXPIRES_IN_SECONDS }),
      ).toThrow("JWT_EXPIRES_IN_SECONDS");
    },
  );
  it("parses token lifetime as seconds", () => {
    expect(validateEnvironment(valid).JWT_EXPIRES_IN_SECONDS).toBe(3600);
    expect(
      validateEnvironment({ ...valid, JWT_EXPIRES_IN_SECONDS: "600" })
        .JWT_EXPIRES_IN_SECONDS,
    ).toBe(600);
  });
  it.each([
    "ftp://example.com",
    "https://user:secret@example.com/v1",
    "https://example.com/v1?token=secret",
  ])("rejects unsafe provider base URL", (VALORANT_API_BASE_URL) => {
    expect(() =>
      validateEnvironment({ ...valid, VALORANT_API_BASE_URL }),
    ).toThrow("VALORANT_API_BASE_URL");
  });
  it.each([0, 30001, "bad"])(
    "rejects invalid provider timeout %s",
    (VALORANT_API_TIMEOUT_MS) => {
      expect(() =>
        validateEnvironment({ ...valid, VALORANT_API_TIMEOUT_MS }),
      ).toThrow("VALORANT_API_TIMEOUT_MS");
    },
  );
});
