import { readFileSync } from "node:fs";
import { parseSnapshot } from "../../src/modules/valorant/valorant.schemas.js";
export function fixtureResponse(
  resource: "maps" | "agents" | "weapons",
): unknown {
  return JSON.parse(
    readFileSync(new URL(`./${resource}.json`, import.meta.url), "utf8"),
  );
}
export function fixtureSnapshot() {
  return parseSnapshot(
    fixtureResponse("maps"),
    fixtureResponse("agents"),
    fixtureResponse("weapons"),
  );
}
