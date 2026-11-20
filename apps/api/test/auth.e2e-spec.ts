import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { compare, getRounds } from "bcrypt";
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
process.env.JWT_EXPIRES_IN_SECONDS = "3600";
const { AppModule } = await import("../src/app.module.js");

const prefix = `auth_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const password = "a sufficiently long password";
function credentials(suffix: string) {
  return {
    username: `${prefix}_${suffix}`,
    email: `${prefix}_${suffix}@example.com`,
    password,
  };
}

describe("Authentication with real PostgreSQL, bcrypt and JWT", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });
  afterAll(async () => {
    try {
      await prisma?.user.deleteMany({
        where: { username: { startsWith: prefix } },
      });
    } finally {
      await app?.close();
    }
  });

  it("registers normalized identities, stores a cost-12 hash and returns public data and expiring JWT", async () => {
    const input = credentials("register");
    const response = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        ...input,
        username: `  ${input.username.toUpperCase()}  `,
        email: ` ${input.email.toUpperCase()} `,
      })
      .expect(201)
      .expect("Cache-Control", "no-store");
    expect(response.body).toMatchObject({
      tokenType: "Bearer",
      expiresIn: 3600,
      user: { username: input.username, email: input.email },
    });
    expect(Object.keys(response.body.user).sort()).toEqual([
      "createdAt",
      "email",
      "id",
      "updatedAt",
      "username",
    ]);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { username: input.username },
    });
    expect(stored.passwordHash).not.toBe(password);
    expect(getRounds(stored.passwordHash)).toBe(12);
    expect(await compare(password, stored.passwordHash)).toBe(true);
    const claims = await jwt.verifyAsync(response.body.accessToken);
    expect(claims.sub).toBe(stored.id);
    expect(claims.exp - claims.iat).toBe(3600);
    expect(claims).not.toHaveProperty("email");
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${response.body.accessToken}`)
      .expect(200, response.body.user)
      .expect("Cache-Control", "no-store");
  });

  it.each(["email", "username"] as const)(
    "returns 409 for duplicate normalized %s",
    async (field) => {
      const first = credentials(`dup_${field}`);
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(first)
        .expect(201);
      const second = {
        ...credentials(`other_${field}`),
        [field]: ` ${first[field].toUpperCase()} `,
      };
      const response = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(second)
        .expect(409);
      expect(response.body.message).toBe(
        "Email or username already registered",
      );
      expect(JSON.stringify(response.body)).not.toContain("P2002");
    },
  );

  it("enforces uniqueness during simultaneous registrations", async () => {
    const input = credentials("concurrent");
    const responses = await Promise.all(
      [1, 2, 3].map(() =>
        request(app.getHttpServer()).post("/api/auth/register").send(input),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409, 409,
    ]);
    expect(await prisma.user.count({ where: { email: input.email } })).toBe(1);
  });

  it.each(["username", "email"] as const)(
    "logs in using normalized %s and never exposes the hash",
    async (field) => {
      const input = credentials(`login_${field}`);
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(input)
        .expect(201);
      const response = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ identifier: ` ${input[field].toUpperCase()} `, password })
        .expect(200);
      expect(response.body.user.username).toBe(input.username);
      expect(response.body.user).not.toHaveProperty("passwordHash");
      expect(response.body.user).not.toHaveProperty("password");
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${response.body.accessToken}`)
        .expect(200);
    },
  );

  it("uses the same 401 response for wrong password and unknown account", async () => {
    const input = credentials("invalid");
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(input)
      .expect(201);
    const wrong = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: input.email, password: "incorrect password" })
      .expect(401);
    const missing = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: `${prefix}_missing`, password })
      .expect(401);
    expect(wrong.body).toEqual(missing.body);
    expect(wrong.body.message).toBe("Invalid credentials");
  });

  it.each([
    { username: "ab" },
    { username: "name@domain" },
    { email: "not-an-email" },
    { password: "short" },
    { password: " ".repeat(12) },
    { password: "a".repeat(73) },
    { password: "é".repeat(37) },
    { password: "long\0password_here" },
    { password: null },
    { role: "admin" },
    { userId: randomUUID() },
  ])(
    "rejects invalid or unexpected registration fields: %j",
    async (override) => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ ...credentials("validation"), ...override })
        .expect(400);
    },
  );

  it("preserves password whitespace and accepts exactly 72 UTF-8 bytes", async () => {
    const input = { ...credentials("bytes"), password: ` ${"é".repeat(35)} ` };
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(input)
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: input.username, password: input.password })
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: input.username, password: input.password.trim() })
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: input.username, password: `${input.password}x` })
      .expect(400);
  });

  it.each([undefined, "Basic abc", "Bearer invalid", "Bearer abc extra"])(
    "rejects absent or malformed authorization: %s",
    async (authorization) => {
      const req = request(app.getHttpServer()).get("/api/auth/me");
      if (authorization) req.set("Authorization", authorization);
      await req.expect(401);
    },
  );

  it("rejects expired, foreign, wrongly signed, missing-expiry and invalid-subject tokens", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(credentials("tokens"))
      .expect(201);
    const subject: string = response.body.user.id;
    const tokens = await Promise.all([
      jwt.signAsync({ sub: subject }, { expiresIn: -1 }),
      jwt.signAsync(
        { sub: subject },
        { secret: "different-secret-at-least-32-bytes-long" },
      ),
      jwt.signAsync({ sub: subject }, { audience: "another-app" }),
      jwt.signAsync({ sub: subject }, { issuer: "another-issuer" }),
      jwt.signAsync({ sub: subject }, { algorithm: "HS384" }),
      new JwtService({ secret: process.env.JWT_SECRET }).signAsync(
        { sub: subject },
        { issuer: "valorant-community-api", audience: "valorant-community" },
      ),
      jwt.signAsync({ sub: "not-a-uuid" }),
      jwt.signAsync({ sub: randomUUID() }),
    ]);
    for (const token of tokens) {
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(401);
    }
  });

  it("rejects a formerly valid token after its account is removed", async () => {
    const input = credentials("removed");
    const response = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(input)
      .expect(201);
    await prisma.user.delete({ where: { username: input.username } });
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${response.body.accessToken}`)
      .expect(401);
  });
});
