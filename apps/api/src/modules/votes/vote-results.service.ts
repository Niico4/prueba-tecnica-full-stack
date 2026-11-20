import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { Prisma } from "../../generated/prisma/client.js";
import { MapResultsDto, RankedChoiceDto } from "./dto/map-results.dto.js";

const catalogSelect = { id: true, displayName: true, displayIcon: true };

function rank(
  items: { id: string; displayName: string; displayIcon: string | null }[],
  counts: Map<string, number>,
  total: number,
): RankedChoiceDto[] {
  return items
    .map((item) => {
      const votes = counts.get(item.id) ?? 0;
      return {
        ...item,
        votes,
        percentage: Math.round((votes / total) * 10000) / 100,
      };
    })
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        compareText(a.displayName, b.displayName) ||
        compareText(a.id, b.id),
    );
}

// Code-unit ordering is stable across host locales.
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

@Injectable()
export class VoteResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(mapId: string): Promise<MapResultsDto> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const map = await tx.map.findUnique({
            where: { id: mapId },
            select: { id: true },
          });
          if (!map) throw new NotFoundException("Map not found");
          const agentGroups = await tx.vote.groupBy({
            by: ["agentId"],
            where: { mapId },
            _count: { _all: true },
          });
          const totalVotes = agentGroups.reduce(
            (total, group) => total + group._count._all,
            0,
          );
          if (!totalVotes)
            return { mapId, totalVotes: 0, agents: [], weapons: [] };
          const weaponGroups = await tx.vote.groupBy({
            by: ["weaponId"],
            where: { mapId },
            _count: { _all: true },
          });
          const agentCounts = new Map(
            agentGroups.map((group) => [group.agentId, group._count._all]),
          );
          const weaponCounts = new Map(
            weaponGroups.map((group) => [group.weaponId, group._count._all]),
          );
          const agents = await tx.agent.findMany({
            where: { id: { in: [...agentCounts.keys()] } },
            select: catalogSelect,
          });
          const weapons = await tx.weapon.findMany({
            where: { id: { in: [...weaponCounts.keys()] } },
            select: catalogSelect,
          });
          return {
            mapId,
            totalVotes,
            agents: rank(agents, agentCounts, totalVotes),
            weapons: rank(weapons, weaponCounts, totalVotes),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("Vote storage is unavailable");
    }
  }
}
