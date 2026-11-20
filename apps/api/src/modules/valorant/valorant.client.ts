import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseSnapshot, ValorantSnapshot } from "./valorant.schemas.js";
@Injectable()
export class ValorantClient {
  constructor(private readonly config: ConfigService) {}
  private async get(resource: "maps" | "agents" | "weapons"): Promise<unknown> {
    const url = new URL(
      `${this.config.getOrThrow<string>("VALORANT_API_BASE_URL")}/${resource}`,
    );
    url.searchParams.set("language", "en-US");
    if (resource === "agents")
      url.searchParams.set("isPlayableCharacter", "true");
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(
          this.config.getOrThrow<number>("VALORANT_API_TIMEOUT_MS"),
        ),
        redirect: "error",
      });
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      throw new Error(
        `Valorant API ${resource} request failed (network, timeout, HTTP or JSON)`,
      );
    }
  }
  async fetchSnapshot(): Promise<ValorantSnapshot> {
    const [maps, agents, weapons] = await Promise.all([
      this.get("maps"),
      this.get("agents"),
      this.get("weapons"),
    ]);
    try {
      return parseSnapshot(maps, agents, weapons);
    } catch {
      throw new Error(
        "Valorant API returned an invalid or duplicate catalog; no data changed",
      );
    }
  }
}
