import axios from 'axios';
import type { ValorantMap } from '@/modules/maps/api';
import { api } from '@/lib/api';
import type { Agent, Vote, VoteSelection, Weapon } from './types';

export async function getMap(id: string, signal: AbortSignal) {
  const { data } = await api.get<ValorantMap>(
    `/maps/${encodeURIComponent(id)}`,
    { signal },
  );

  return data;
}

export async function getCatalog(signal: AbortSignal) {
  const [agents, weapons] = await Promise.all([
    api.get<Agent[]>('/agents', { signal }),
    api.get<Weapon[]>('/weapons', { signal }),
  ]);

  return {
    agents: agents.data,
    weapons: weapons.data,
  };
}

export async function getVote(
  mapId: string,
  token: string,
  signal: AbortSignal,
) {
  const { data } = await api.get<Vote | null>(
    `/maps/${encodeURIComponent(mapId)}/vote`,
    {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return data;
}

export async function saveVote(
  mapId: string,
  token: string,
  selection: VoteSelection,
  signal: AbortSignal,
) {
  const { data } = await api.put<Vote>(
    `/maps/${encodeURIComponent(mapId)}/vote`,
    selection,
    {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return data;
}

export async function getHistoricalChoices(vote: Vote, signal: AbortSignal) {
  const [agent, weapon] = await Promise.all([
    api.get<Agent>(`/agents/${encodeURIComponent(vote.agentId)}`, { signal }),
    api.get<Weapon>(`/weapons/${encodeURIComponent(vote.weaponId)}`, {
      signal,
    }),
  ]);

  return {
    agent: agent.data,
    weapon: weapon.data,
  };
}

export function votingError(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;

  switch (status) {
    case 400:
      return 'El identificador o la selección no son válidos.';
    case 401:
      return 'Tu sesión expiró. Inicia sesión para guardar tu voto.';
    case 404:
      return 'No encontramos el mapa o alguno de los elementos seleccionados.';
    case 422:
      return 'El mapa, agente o arma ya no está disponible para votar. Recarga el catálogo y revisa tu selección.';
    default:
      return 'No pudimos completar la solicitud. Comprueba tu conexión e inténtalo de nuevo.';
  }
}
