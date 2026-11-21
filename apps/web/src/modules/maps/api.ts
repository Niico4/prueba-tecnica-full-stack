import { api } from "@/lib/api";

export interface ValorantMap {
  id: string;
  displayName: string;
  tacticalDescription: string | null;
  displayIcon: string | null;
  splash: string | null;
  isActive: boolean;
}

export async function getMaps(signal: AbortSignal) {
  return (await api.get<ValorantMap[]>("/maps", { signal })).data;
}
