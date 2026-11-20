import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { setupApp } from "../src/config/setup-app.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { ValorantClient } from "../src/modules/valorant/valorant.client.js";
import { mapSnapshot } from "../src/modules/valorant/valorant.mappers.js";
import { ValorantModule } from "../src/modules/valorant/valorant.module.js";
import { parseSnapshot } from "../src/modules/valorant/valorant.schemas.js";
import { ValorantSyncService } from "../src/modules/valorant/valorant-sync.service.js";
import { fixtureSnapshot } from "./fixtures/catalog.js";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || new URL(testUrl).pathname !== "/valorant_test")
  throw new Error("TEST_DATABASE_URL must target isolated valorant_test");
process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-only-at-least-32-bytes-long";
const { AppModule } = await import("../src/app.module.js");
const baseline = mapSnapshot(fixtureSnapshot());
function first<T>(items: T[]): T {
  const value = items[0];
  if (!value) throw new Error("Nonempty fixture required");
  return value;
}
const map = first(baseline.maps);
const agent = first(baseline.agents);
const weapon = first(baseline.weapons);
const userId = randomUUID();
const extraId = randomUUID();

describe("Catalog sync and public reads with isolated PostgreSQL", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sync: ValorantSyncService;
  let snapshot = fixtureSnapshot();
  const fetchSnapshot = vi.fn(async () =>
    parseSnapshot(
      { status: 200, data: snapshot.maps },
      { status: 200, data: snapshot.agents },
      { status: 200, data: snapshot.weapons },
    ),
  );
  let ownsCatalog = false;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule, ValorantModule],
    })
      .overrideProvider(ValorantClient)
      .useValue({ fetchSnapshot })
      .compile();
    app = module.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    sync = app.get(ValorantSyncService);
    if (
      (await prisma.map.count()) ||
      (await prisma.agent.count()) ||
      (await prisma.weapon.count())
    )
      throw new Error(
        "Catalog E2E requires an empty test catalog; restart db-test and migrate",
      );
    ownsCatalog = true;
  });
  beforeEach(async () => {
    snapshot = fixtureSnapshot();
    fetchSnapshot.mockClear();
    await sync.synchronize();
  });
  afterAll(async () => {
    try {
      if (ownsCatalog) {
        await prisma.vote.deleteMany({ where: { userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
        await prisma.agent.deleteMany({
          where: { id: { in: baseline.agents.map((item) => item.id) } },
        });
        await prisma.weapon.deleteMany({
          where: {
            id: { in: [...baseline.weapons.map((item) => item.id), extraId] },
          },
        });
        await prisma.map.deleteMany({
          where: { id: { in: baseline.maps.map((item) => item.id) } },
        });
        await prisma.agentRole.deleteMany({
          where: { id: { in: baseline.roles.map((item) => item.id) } },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it("is idempotent and updates existing records without duplicating children", async () => {
    const result = await sync.synchronize();
    expect(result).toMatchObject({
      maps: 13,
      agents: 30,
      weapons: 21,
      roles: 4,
      retired: 0,
    });
    expect(await prisma.agentAbility.count()).toBe(baseline.abilities.length);
    expect(await prisma.weaponDamageRange.count()).toBe(
      baseline.damageRanges.length,
    );
    const original = snapshot.agents.find((item) => item.uuid === agent.id);
    if (!original) throw new Error("Missing agent");
    original.displayName = "Updated Agent";
    original.abilities.pop();
    await sync.synchronize();
    expect(
      (await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } }))
        .displayName,
    ).toBe("Updated Agent");
    expect(
      await prisma.agentAbility.count({ where: { agentId: agent.id } }),
    ).toBe(original.abilities.length);
    expect(await prisma.agent.count()).toBe(30);
  });

  it("serves public lists and nested details without external requests", async () => {
    fetchSnapshot.mockRejectedValueOnce(new Error("provider offline"));
    const before = fetchSnapshot.mock.calls.length;
    for (const [resource, id, count] of [
      ["maps", map.id, 13],
      ["agents", agent.id, 30],
      ["weapons", weapon.id, 21],
    ] as const) {
      const list = await request(app.getHttpServer())
        .get(`/api/${resource}`)
        .expect(200);
      expect(list.body).toHaveLength(count);
      const detail = await request(app.getHttpServer())
        .get(`/api/${resource}/${id.toUpperCase()}`)
        .expect(200);
      expect(detail.body.id).toBe(id);
    }
    expect(fetchSnapshot).toHaveBeenCalledTimes(before);
    const detail = await request(app.getHttpServer())
      .get(`/api/agents/${agent.id}`)
      .expect(200);
    expect(detail.body.role.id).toBe(agent.roleId);
    expect(detail.body.abilities.length).toBeGreaterThan(0);
    await expect(sync.synchronize()).rejects.toThrow("provider offline");
    await request(app.getHttpServer()).get("/api/maps").expect(200);
  });

  it.each(["maps", "agents", "weapons"])(
    "validates route IDs and unknown %s",
    async (resource) => {
      await request(app.getHttpServer())
        .get(`/api/${resource}/malformed`)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/api/${resource}/${randomUUID()}`)
        .expect(404);
    },
  );

  it("keeps nullable Melee and real fractional damage values", async () => {
    const melee = first(
      baseline.weapons.filter((item) => item.displayName === "Melee"),
    );
    const response = await request(app.getHttpServer())
      .get(`/api/weapons/${melee.id}`)
      .expect(200);
    expect(response.body).toMatchObject({
      category: "Melee",
      cost: null,
      damageRanges: [],
    });
    const damage = await prisma.weaponDamageRange.findMany({
      where: { weaponId: weapon.id },
    });
    expect(damage.some((range) => !Number.isInteger(range.legDamage))).toBe(
      true,
    );
  });

  it("rejects partial snapshots without updating or deactivating existing rows", async () => {
    snapshot.weapons.pop();
    first(snapshot.agents).displayName = "Must not persist";
    await expect(sync.synchronize()).rejects.toThrow("removals need review");
    expect(await prisma.weapon.count({ where: { isActive: true } })).toBe(21);
    expect(
      (await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } }))
        .displayName,
    ).toBe(agent.displayName);
  });

  it("rejects invalid nested data and preserves previous dependent collections", async () => {
    const range = first(
      first(snapshot.weapons).weaponStats?.damageRanges ?? [],
    );
    range.legDamage = -1;
    await expect(sync.synchronize()).rejects.toThrow();
    expect(await prisma.weaponDamageRange.count()).toBe(
      baseline.damageRanges.length,
    );
    expect(await prisma.map.count({ where: { isActive: true } })).toBe(13);
  });

  it("rolls back parent and child writes if the database rejects a later write", async () => {
    const next = structuredClone(baseline);
    const source = first(snapshot.weapons);
    // A mapper-independent SQL constraint failure after earlier upserts tests transaction rollback.
    await prisma.$executeRaw`ALTER TABLE weapon_damage_ranges ADD CONSTRAINT test_catalog_rollback CHECK (head_damage <> 999999)`;
    try {
      const targetMap = snapshot.maps.find((item) => item.uuid === map.id);
      if (!targetMap) throw new Error("Missing map");
      targetMap.displayName = "Fail transaction";
      first(
        first(snapshot.weapons).weaponStats?.damageRanges ?? [],
      ).headDamage = 999999;
      await expect(sync.synchronize()).rejects.toThrow();
      expect(await prisma.weapon.count()).toBe(next.weapons.length);
      expect(
        await prisma.weaponDamageRange.count({
          where: { weaponId: source.uuid },
        }),
      ).toBe(
        baseline.damageRanges.filter((item) => item.weaponId === source.uuid)
          .length,
      );
      expect(
        (await prisma.map.findUniqueOrThrow({ where: { id: map.id } }))
          .displayName,
      ).toBe(map.displayName);
    } finally {
      await prisma.$executeRaw`ALTER TABLE weapon_damage_ranges DROP CONSTRAINT test_catalog_rollback`;
    }
  });

  it("requires exact approved retirements and preserves votes referencing retired catalog items", async () => {
    await prisma.user.create({
      data: {
        id: userId,
        username: `catalog_${userId.replaceAll("-", "")}`,
        email: `${userId}@example.com`,
        passwordHash: "unused-test-only",
      },
    });
    await prisma.vote.create({
      data: { userId, mapId: map.id, agentId: agent.id, weaponId: weapon.id },
    });
    snapshot.maps = snapshot.maps.filter((item) => item.uuid !== map.id);
    snapshot.agents = snapshot.agents.filter((item) => item.uuid !== agent.id);
    snapshot.weapons = snapshot.weapons.filter(
      (item) => item.uuid !== weapon.id,
    );
    await expect(sync.synchronize([map.id])).rejects.toThrow(
      "exact --retire-id list",
    );
    const ids = [map.id, agent.id, weapon.id];
    expect((await sync.synchronize(ids)).retired).toBe(3);
    expect(await prisma.vote.count({ where: { userId } })).toBe(1);
    const list = await request(app.getHttpServer())
      .get("/api/maps")
      .expect(200);
    expect(list.body.some((item: { id: string }) => item.id === map.id)).toBe(
      false,
    );
    const detail = await request(app.getHttpServer())
      .get(`/api/maps/${map.id}`)
      .expect(200);
    expect(detail.body.isActive).toBe(false);
    expect((await sync.synchronize(ids)).retired).toBe(0);
    snapshot = fixtureSnapshot();
    await sync.synchronize();
    expect(
      (await prisma.map.findUniqueOrThrow({ where: { id: map.id } })).isActive,
    ).toBe(true);
  });

  it("protects newly discovered items against later partial responses too", async () => {
    snapshot.weapons.push({
      ...first(snapshot.weapons),
      uuid: extraId,
      displayName: "New weapon",
    });
    await sync.synchronize();
    snapshot.weapons.pop();
    await expect(sync.synchronize()).rejects.toThrow(extraId);
    await sync.synchronize([extraId]);
    expect(
      (await prisma.weapon.findUniqueOrThrow({ where: { id: extraId } }))
        .isActive,
    ).toBe(false);
  });

  it("blocks a competing synchronization before requesting external data", async () => {
    const calls = fetchSnapshot.mock.calls.length;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(8042026)::text`;
      await expect(sync.synchronize()).rejects.toThrow(
        "Another catalog synchronization",
      );
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(calls);
  });
});
