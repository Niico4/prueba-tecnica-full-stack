import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupApp } from "../src/config/setup-app.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { MapResultsDto } from "../src/modules/votes/dto/map-results.dto.js";

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

const users = [randomUUID(), randomUUID(), randomUUID()] as const;
const maps = [randomUUID(), randomUUID()] as const;
// Catalog GUIDs need not carry RFC version/variant bits.
const agents = [
  randomUUID().replace(/^(.{14})./, "$1e"),
  randomUUID(),
] as const;
const weapons = [randomUUID(), randomUUID()] as const;
const roleId = randomUUID();
const choice = { agentId: agents[0], weaponId: weapons[0] };
const alternative = { agentId: agents[1], weaponId: weapons[1] };

describe("Voting with real PostgreSQL and JWT", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: string[];
  const path = (mapId: string = maps[0]) => `/api/maps/${mapId}/vote`;
  const put = (body: object = choice, mapId: string = maps[0], user = 0) =>
    request(app.getHttpServer())
      .put(path(mapId))
      .auth(tokens[user] ?? "", { type: "bearer" })
      .send(body);
  const get = (mapId: string = maps[0], user = 0) =>
    request(app.getHttpServer())
      .get(path(mapId))
      .auth(tokens[user] ?? "", { type: "bearer" });

  const results = (mapId: string = maps[0]) =>
    request(app.getHttpServer()).get(`/api/maps/${mapId}/results`);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.createMany({
      data: users.map((id) => ({
        id,
        username: `vote_${id}`,
        email: `vote_${id}@example.com`,
        passwordHash: "unused",
      })),
    });
    await prisma.map.createMany({
      data: maps.map((id) => ({ id, displayName: "Voting fixture" })),
    });
    await prisma.agentRole.create({
      data: { id: roleId, displayName: "Fixture", description: "" },
    });
    await prisma.agent.createMany({
      data: agents.map((id) => ({
        id,
        roleId,
        displayName: "Voting fixture",
        description: "",
      })),
    });
    await prisma.weapon.createMany({
      data: weapons.map((id) => ({
        id,
        displayName: "Voting fixture",
        category: "Fixture",
      })),
    });
    const jwt = app.get(JwtService);
    tokens = await Promise.all(users.map((sub) => jwt.signAsync({ sub })));
  });
  beforeEach(async () => {
    await prisma.vote.deleteMany({ where: { userId: { in: [...users] } } });
    await prisma.map.updateMany({
      where: { id: { in: [...maps] } },
      data: { isActive: true },
    });
    await prisma.agent.updateMany({
      where: { id: { in: [...agents] } },
      data: {
        isActive: true,
        displayName: "Voting fixture",
        displayIcon: null,
      },
    });
    await prisma.weapon.updateMany({
      where: { id: { in: [...weapons] } },
      data: {
        isActive: true,
        displayName: "Voting fixture",
        displayIcon: null,
      },
    });
  });
  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.vote.deleteMany({ where: { userId: { in: [...users] } } });
        await prisma.user.deleteMany({ where: { id: { in: [...users] } } });
        await prisma.map.deleteMany({ where: { id: { in: [...maps] } } });
        await prisma.agent.deleteMany({ where: { id: { in: [...agents] } } });
        await prisma.weapon.deleteMany({ where: { id: { in: [...weapons] } } });
        await prisma.agentRole.deleteMany({ where: { id: roleId } });
      }
    } finally {
      await app?.close();
    }
  });

  it("serves empty public results, rejects invalid/missing maps and describes the real OpenAPI contract", async () => {
    await results(maps[0].toUpperCase()).expect(200, {
      mapId: maps[0],
      totalVotes: 0,
      agents: [],
      weapons: [],
    });
    await results("invalid").expect(400);
    await results(randomUUID()).expect(404);
    const { body } = await request(app.getHttpServer())
      .get("/api/docs-json")
      .expect(200);
    const operation = body.paths["/api/maps/{mapId}/results"].get;
    expect(operation.security ?? []).toEqual([]);
    expect(Object.keys(operation.responses).sort()).toEqual([
      "200",
      "400",
      "404",
      "503",
    ]);
    expect(operation.parameters).toContainEqual(
      expect.objectContaining({ name: "mapId", in: "path", required: true }),
    );
    expect(
      operation.responses["200"].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/MapResultsDto");
    expect(
      Object.keys(body.components.schemas.MapResultsDto.properties).sort(),
    ).toEqual(["agents", "mapId", "totalVotes", "weapons"]);
    const ranked = body.components.schemas.RankedChoiceDto;
    expect(Object.keys(ranked.properties).sort()).toEqual([
      "displayIcon",
      "displayName",
      "id",
      "percentage",
      "votes",
    ]);
    expect(ranked.properties.displayIcon.nullable).toBe(true);
  });

  it("aggregates independent choices, rounds percentages and reflects edits and inactive history", async () => {
    await put().expect(200);
    const single = (await results().expect(200)).body;
    expect(single).toEqual({
      mapId: maps[0],
      totalVotes: 1,
      agents: [
        {
          id: agents[0],
          displayName: "Voting fixture",
          displayIcon: null,
          votes: 1,
          percentage: 100,
        },
      ],
      weapons: [
        {
          id: weapons[0],
          displayName: "Voting fixture",
          displayIcon: null,
          votes: 1,
          percentage: 100,
        },
      ],
    });
    await put(choice, maps[0], 1).expect(200);
    await put(choice, maps[0], 2).expect(200);
    const unanimous = (await results().expect(200)).body;
    expect(unanimous.agents).toMatchObject([{ votes: 3, percentage: 100 }]);
    expect(unanimous.weapons).toMatchObject([{ votes: 3, percentage: 100 }]);
    await put({ agentId: agents[1], weaponId: weapons[0] }, maps[0], 1).expect(
      200,
    );
    await put({ agentId: agents[0], weaponId: weapons[1] }, maps[0], 2).expect(
      200,
    );
    await put(alternative, maps[1]).expect(200);
    await prisma.agent.update({
      where: { id: agents[0] },
      data: { displayIcon: "https://example.com/agent.png" },
    });
    const mixed = (await results().expect(200)).body;
    expect(mixed.totalVotes).toBe(
      await prisma.vote.count({ where: { mapId: maps[0] } }),
    );
    expect(mixed.agents).toMatchObject([
      {
        id: agents[0],
        displayIcon: "https://example.com/agent.png",
        votes: 2,
        percentage: 66.67,
      },
      { id: agents[1], votes: 1, percentage: 33.33 },
    ]);
    expect(mixed.weapons).toMatchObject([
      { id: weapons[0], votes: 2, percentage: 66.67 },
      { id: weapons[1], votes: 1, percentage: 33.33 },
    ]);
    const other = (await results(maps[1]).expect(200)).body;
    expect(other.totalVotes).toBe(1);
    expect(other.agents).toMatchObject([
      { id: agents[1], votes: 1, percentage: 100 },
    ]);
    for (const ranking of [mixed.agents, mixed.weapons]) {
      expect(
        ranking.reduce(
          (sum: number, item: { votes: number }) => sum + item.votes,
          0,
        ),
      ).toBe(mixed.totalVotes);
    }
    await prisma.map.update({
      where: { id: maps[0] },
      data: { isActive: false },
    });
    await prisma.agent.update({
      where: { id: agents[0] },
      data: { isActive: false },
    });
    await prisma.weapon.update({
      where: { id: weapons[0] },
      data: { isActive: false },
    });
    await results().expect(200, mixed);
  });

  it("breaks ties by name, then UUID for both rankings", async () => {
    await put().expect(200);
    await put(alternative, maps[0], 1).expect(200);
    await prisma.agent.update({
      where: { id: agents[0] },
      data: { displayName: "Zeta" },
    });
    await prisma.agent.update({
      where: { id: agents[1] },
      data: { displayName: "Alpha" },
    });
    await prisma.weapon.update({
      where: { id: weapons[0] },
      data: { displayName: "Zeta" },
    });
    await prisma.weapon.update({
      where: { id: weapons[1] },
      data: { displayName: "Alpha" },
    });
    const named: MapResultsDto = (await results().expect(200)).body;
    expect(named.agents.map((item) => item.id)).toEqual([agents[1], agents[0]]);
    expect(named.weapons.map((item) => item.id)).toEqual([
      weapons[1],
      weapons[0],
    ]);
    await prisma.agent.updateMany({
      where: { id: { in: [...agents] } },
      data: { displayName: "Equal" },
    });
    await prisma.weapon.updateMany({
      where: { id: { in: [...weapons] } },
      data: { displayName: "Equal" },
    });
    const tied: MapResultsDto = (await results().expect(200)).body;
    expect(tied.agents.map((item) => item.id)).toEqual([...agents].sort());
    expect(tied.weapons.map((item) => item.id)).toEqual([...weapons].sort());
    expect(tied.agents.map((item) => item.percentage)).toEqual([50, 50]);
  });

  it("keeps totals and both rankings coherent during concurrent vote changes", async () => {
    await put().expect(200);
    const reads = await Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        const [response] = await Promise.all([
          results().expect(200),
          put(index % 2 ? choice : alternative).expect(200),
        ]);
        return response.body as MapResultsDto;
      }),
    );
    for (const snapshot of reads) {
      expect(snapshot.totalVotes).toBe(1);
      expect(snapshot.agents).toHaveLength(1);
      expect(snapshot.weapons).toHaveLength(1);
      const agent = snapshot.agents[0];
      const weapon = snapshot.weapons[0];
      expect(agent).toMatchObject({ votes: 1, percentage: 100 });
      expect(weapon).toMatchObject({ votes: 1, percentage: 100 });
      expect([choice, alternative]).toContainEqual({
        agentId: agent?.id,
        weaponId: weapon?.id,
      });
    }
  });

  it("creates, reads and updates one vote while preserving identity and creation date", async () => {
    const empty = await get().expect(200).expect("Content-Type", /json/);
    expect(empty.text).toBe("null");
    const first = await put().expect(200).expect("Cache-Control", "no-store");
    expect(first.body).toMatchObject({ mapId: maps[0], ...choice });
    expect(Object.keys(first.body).sort()).toEqual([
      "agentId",
      "createdAt",
      "id",
      "mapId",
      "updatedAt",
      "weaponId",
    ]);
    await get().expect(200, first.body).expect("Cache-Control", "no-store");
    // A known older timestamp makes change detection independent of clock resolution.
    await prisma.vote.update({
      where: { id: first.body.id },
      data: { updatedAt: new Date("2020-01-01") },
    });
    const changed = await put(alternative).expect(200);
    expect(changed.body).toMatchObject({
      id: first.body.id,
      createdAt: first.body.createdAt,
      ...alternative,
    });
    expect(new Date(changed.body.updatedAt).getTime()).toBeGreaterThan(
      Date.parse("2020-01-01"),
    );
    expect(
      await prisma.vote.count({ where: { userId: users[0], mapId: maps[0] } }),
    ).toBe(1);
  });

  it("does not touch an unchanged row, even when GUID casing differs", async () => {
    await put().expect(200);
    const before = await prisma.$queryRaw<
      { version: string; updated: string }[]
    >`
      SELECT xmin::text AS version, updated_at::text AS updated FROM votes
      WHERE user_id = ${users[0]}::uuid AND map_id = ${maps[0]}::uuid
    `;
    await put(
      {
        agentId: choice.agentId.toUpperCase(),
        weaponId: choice.weaponId.toUpperCase(),
      },
      maps[0].toUpperCase(),
    ).expect(200);
    const after = await prisma.$queryRaw<
      { version: string; updated: string }[]
    >`
      SELECT xmin::text AS version, updated_at::text AS updated FROM votes
      WHERE user_id = ${users[0]}::uuid AND map_id = ${maps[0]}::uuid
    `;
    expect(after).toEqual(before);
  });

  it("isolates users and maps, rejects a supplied userId, and preserves other votes", async () => {
    const first = await put().expect(200);
    expect((await get(maps[0], 1).expect(200)).text).toBe("null");
    await put({ ...alternative, userId: users[0] }, maps[0], 1).expect(400);
    await put(alternative, maps[0], 1).expect(200);
    await put(alternative, maps[1]).expect(200);
    await get().expect(200, first.body);
    expect((await get(maps[1]).expect(200)).body).toMatchObject(alternative);
    expect((await get(maps[0], 1).expect(200)).body).toMatchObject(alternative);
    expect(
      await prisma.vote.count({ where: { userId: { in: [...users] } } }),
    ).toBe(3);
  });

  it("requires authentication on both operations", async () => {
    for (const token of [undefined, "invalid"]) {
      const read = request(app.getHttpServer()).get(path());
      const write = request(app.getHttpServer()).put(path()).send(choice);
      if (token) {
        read.auth(token, { type: "bearer" });
        write.auth(token, { type: "bearer" });
      }
      await read.expect(401);
      await write.expect(401);
    }
  });

  it("rejects malformed GUIDs, missing selections and invalid body types", async () => {
    await get("invalid").expect(400);
    await put(choice, "invalid").expect(400);
    for (const body of [
      {},
      { agentId: agents[0] },
      { ...choice, agentId: "invalid" },
      { ...choice, weaponId: null },
      { ...choice, agentId: 42 },
    ]) {
      await put(body).expect(400);
    }
    expect(await prisma.vote.count({ where: { userId: users[0] } })).toBe(0);
  });

  it("rejects missing catalog records without changing an existing vote", async () => {
    const saved = await put().expect(200);
    await get(randomUUID()).expect(404);
    await put(choice, randomUUID()).expect(404);
    await put({ ...choice, agentId: randomUUID() }).expect(404);
    await put({ ...choice, weaponId: randomUUID() }).expect(404);
    await get().expect(200, saved.body);
  });

  it("rejects each inactive choice but keeps historical votes readable", async () => {
    const saved = await put().expect(200);
    await prisma.weapon.update({
      where: { id: weapons[0] },
      data: { isActive: false },
    });
    await put().expect(422);
    await prisma.agent.update({
      where: { id: agents[0] },
      data: { isActive: false },
    });
    await put({ ...choice, weaponId: weapons[1] }).expect(422);
    await prisma.map.update({
      where: { id: maps[0] },
      data: { isActive: false },
    });
    await put(alternative).expect(422);
    await get().expect(200, saved.body);
    expect((await get(maps[0], 1).expect(200)).text).toBe("null");
  });

  it("serializes competing first writes and updates without duplicate votes", async () => {
    for (let round = 0; round < 2; round++) {
      const responses = await Promise.all(
        Array.from({ length: 8 }, (_, i) => put(i % 2 ? choice : alternative)),
      );
      expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
      expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
      expect(new Set(responses.map((r) => r.body.createdAt)).size).toBe(1);
      const stored = await prisma.vote.findMany({
        where: { userId: users[0], mapId: maps[0] },
      });
      expect(stored).toHaveLength(1);
      expect([choice, alternative]).toContainEqual({
        agentId: stored[0]?.agentId,
        weaponId: stored[0]?.weaponId,
      });
    }
  });

  it("enforces uniqueness and historical foreign keys in PostgreSQL itself", async () => {
    await put().expect(200);
    await expect(
      prisma.vote.create({
        data: { userId: users[0], mapId: maps[0], ...choice },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      prisma.agent.delete({ where: { id: agents[0] } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("publishes authenticated contracts, nullable reads and all expected errors in OpenAPI", async () => {
    const { body } = await request(app.getHttpServer())
      .get("/api/docs-json")
      .expect(200);
    const endpoint = body.paths["/api/maps/{mapId}/vote"];
    for (const method of ["get", "put"]) {
      expect(endpoint[method].security).toEqual([{ bearer: [] }]);
      expect(endpoint[method].parameters).toContainEqual(
        expect.objectContaining({ name: "mapId", in: "path", required: true }),
      );
      expect(Object.keys(endpoint[method].responses)).toEqual(
        expect.arrayContaining(["200", "400", "401", "404", "503"]),
      );
    }
    expect(endpoint.put.responses).toHaveProperty("422");
    expect(
      endpoint.put.requestBody.content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UpsertVoteDto");
    expect(
      endpoint.get.responses["200"].content["application/json"].schema.anyOf,
    ).toContainEqual({ type: "object", nullable: true, enum: [null] });
    expect(body.components.schemas.VoteDto.properties).not.toHaveProperty(
      "userId",
    );
  });
});
