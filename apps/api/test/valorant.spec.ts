import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogIdPipe } from "../src/common/catalog-id.pipe.js";
import { ValorantClient } from "../src/modules/valorant/valorant.client.js";
import { mapSnapshot } from "../src/modules/valorant/valorant.mappers.js";
import { parseSnapshot } from "../src/modules/valorant/valorant.schemas.js";
import { fixtureResponse, fixtureSnapshot } from "./fixtures/catalog.js";

function parseEdited(
  edit: (snapshot: ReturnType<typeof fixtureSnapshot>) => void,
) {
  const snapshot = fixtureSnapshot();
  edit(snapshot);
  return parseSnapshot(
    { status: 200, data: snapshot.maps },
    { status: 200, data: snapshot.agents },
    { status: 200, data: snapshot.weapons },
  );
}
describe("Validated external contracts and explicit mapping", () => {
  it("accepts the reviewed snapshots and only persists selected standard maps", () => {
    const catalog = mapSnapshot(fixtureSnapshot());
    expect(catalog.maps).toHaveLength(13);
    expect(catalog.agents).toHaveLength(30);
    expect(catalog.weapons).toHaveLength(21);
    expect(catalog.roles).toHaveLength(4);
    expect(catalog.maps.some((map) => map.displayName === "The Range")).toBe(
      false,
    );
    expect(catalog.maps.some((map) => map.displayName === "Summit")).toBe(true);
    const melee = catalog.weapons.find(
      (weapon) => weapon.displayName === "Melee",
    );
    expect(melee).toMatchObject({ cost: null, category: "Melee" });
    expect(
      catalog.damageRanges.some((range) => range.weaponId === melee?.id),
    ).toBe(false);
    expect(
      catalog.weapons.find((weapon) => weapon.displayName === "Classic")?.cost,
    ).toBe(0);
    expect(
      catalog.damageRanges.some((range) => !Number.isInteger(range.legDamage)),
    ).toBe(true);
  });
  it("keeps colors unchanged and allows future ability slot names", () => {
    const snapshot = parseEdited((snapshot) => {
      const agent = snapshot.agents[0];
      if (agent?.abilities[0]) agent.abilities[0].slot = "FutureAbility";
    });
    const catalog = mapSnapshot(snapshot);
    expect(catalog.agents[0]?.backgroundGradientColors).toEqual(
      snapshot.agents[0]?.backgroundGradientColors,
    );
    expect(
      catalog.abilities.some((ability) => ability.slot === "FutureAbility"),
    ).toBe(true);
  });
  it("filters non-playable agents and handles nullable visual fields", () => {
    const snapshot = parseEdited((snapshot) => {
      const agent = snapshot.agents[0];
      if (agent) {
        agent.isPlayableCharacter = false;
        agent.role = null;
      }
      const map = snapshot.maps[1];
      if (map) {
        map.splash = null;
        map.displayIcon = null;
      }
    });
    expect(mapSnapshot(snapshot).agents).toHaveLength(29);
  });
  it("falls back to the root category without inventing a cost", () => {
    const snapshot = parseEdited((snapshot) => {
      const weapon = snapshot.weapons[0];
      if (weapon?.shopData) {
        weapon.shopData.categoryText = null;
        weapon.shopData.cost = null;
      }
    });
    expect(mapSnapshot(snapshot).weapons[0]).toMatchObject({
      category: "Heavy Weapons",
      cost: null,
    });
  });
  it("rejects unknown fallback categories", () => {
    const snapshot = parseEdited((snapshot) => {
      const weapon = snapshot.weapons[0];
      if (weapon) {
        weapon.category = "Unknown";
        weapon.shopData = null;
      }
    });
    expect(() => mapSnapshot(snapshot)).toThrow("Unmapped weapon category");
  });
  it.each([
    "negative",
    "reversed",
    "fractional-distance",
    "infinite",
    "duplicate",
  ] as const)("rejects invalid damage ranges: %s", (kind) => {
    expect(() =>
      parseEdited((snapshot) => {
        const ranges = snapshot.weapons[0]?.weaponStats?.damageRanges;
        const range = ranges?.[0];
        if (!range || !ranges) throw new Error("Fixture needs damage ranges");
        if (kind === "negative") range.headDamage = -1;
        if (kind === "reversed") range.rangeEndMeters = range.rangeStartMeters;
        if (kind === "fractional-distance") range.rangeStartMeters = 0.5;
        if (kind === "infinite") range.headDamage = Number.POSITIVE_INFINITY;
        if (kind === "duplicate") ranges.push({ ...range });
      }),
    ).toThrow();
  });
  it("rejects playable agents without a role and duplicate slots", () => {
    expect(() =>
      parseEdited((snapshot) => {
        const agent = snapshot.agents[0];
        if (agent) agent.role = null;
      }),
    ).toThrow();
    expect(() =>
      parseEdited((snapshot) => {
        const agent = snapshot.agents[0];
        const ability = agent?.abilities[0];
        if (agent && ability) agent.abilities.push({ ...ability });
      }),
    ).toThrow();
  });
  it("rejects duplicate identities, invalid envelopes and missing fields", () => {
    expect(() =>
      parseEdited((snapshot) => {
        const map = snapshot.maps[0];
        if (map) snapshot.maps.push(map);
      }),
    ).toThrow("Duplicate");
    expect(() =>
      parseSnapshot(
        { status: 200, data: [] },
        fixtureResponse("agents"),
        fixtureResponse("weapons"),
      ),
    ).toThrow();
    expect(() =>
      parseSnapshot(
        { status: 503, data: [] },
        fixtureResponse("agents"),
        fixtureResponse("weapons"),
      ),
    ).toThrow();
    expect(() =>
      parseSnapshot(
        { status: 200, data: [{ uuid: "invalid" }] },
        fixtureResponse("agents"),
        fixtureResponse("weapons"),
      ),
    ).toThrow();
  });
  it("rejects conflicting role definitions", () => {
    const snapshot = fixtureSnapshot();
    const first = snapshot.agents[0]?.role;
    const other = snapshot.agents.find(
      (agent, index) => index > 0 && agent.role?.uuid === first?.uuid,
    );
    if (!other?.role) throw new Error("Fixture must share roles");
    other.role.description = "Conflicting description";
    expect(() => mapSnapshot(snapshot)).toThrow("Conflicting");
  });
  it("accepts Valorant GUID version bits but rejects malformed route IDs", () => {
    const pipe = new CatalogIdPipe();
    expect(pipe.transform("D960549E-485C-E861-8D71-AA9D1AED12A2")).toBe(
      "d960549e-485c-e861-8d71-aa9d1aed12a2",
    );
    expect(() => pipe.transform("not-a-uuid")).toThrow();
  });
});

describe("Valorant HTTP client", () => {
  const client = new ValorantClient(
    new ConfigService({
      VALORANT_API_BASE_URL: "https://provider.example/v1",
      VALORANT_API_TIMEOUT_MS: 100,
    }),
  );
  afterEach(() => vi.unstubAllGlobals());
  it("requests en-US and playable agents, validates responses", async () => {
    const fetchMock = vi.fn(async (input: URL) => {
      expect(input.searchParams.get("language")).toBe("en-US");
      if (input.pathname.endsWith("/agents"))
        expect(input.searchParams.get("isPlayableCharacter")).toBe("true");
      const resource = input.pathname.endsWith("/maps")
        ? "maps"
        : input.pathname.endsWith("/agents")
          ? "agents"
          : "weapons";
      return new Response(JSON.stringify(fixtureResponse(resource)), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect((await client.fetchSnapshot()).agents).toHaveLength(30);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it.each(["http", "network", "json", "schema"] as const)(
    "rejects %s failures",
    async (kind) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          if (kind === "network") throw new Error("offline");
          return new Response(kind === "json" ? "<html>" : "{}", {
            status: kind === "http" ? 503 : 200,
          });
        }),
      );
      await expect(client.fetchSnapshot()).rejects.toThrow("Valorant API");
    },
  );
  it("aborts slow HTTP requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: URL, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener(
              "abort",
              () => reject(new Error("timeout")),
              { once: true },
            );
          }),
      ),
    );
    await expect(client.fetchSnapshot()).rejects.toThrow("request failed");
  });
});
