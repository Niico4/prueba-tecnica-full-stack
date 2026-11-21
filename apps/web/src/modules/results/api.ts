import { api } from "@/lib/api";

export interface RankedChoice {
  id: string;
  displayName: string;
  displayIcon: string | null;
  votes: number;
  percentage: number;
}
export interface MapResults {
  mapId: string;
  totalVotes: number;
  agents: RankedChoice[];
  weapons: RankedChoice[];
}
export async function getResults(mapId: string, signal: AbortSignal) {
  return (
    await api.get<MapResults>(`/maps/${encodeURIComponent(mapId)}/results`, {
      signal,
    })
  ).data;
}
