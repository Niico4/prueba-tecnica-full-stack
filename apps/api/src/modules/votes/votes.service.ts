import { randomUUID } from "node:crypto";
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { Prisma } from "../../generated/prisma/client.js";
import { UpsertVoteDto } from "./dto/upsert-vote.dto.js";
import { VoteDto } from "./dto/vote.dto.js";

const voteSelect = {
  id: true,
  mapId: true,
  agentId: true,
  weaponId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.voteSelect;

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, mapId: string): Promise<VoteDto | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const map = await tx.map.findUnique({
          where: { id: mapId },
          select: { id: true },
        });
        if (!map) throw new NotFoundException("Map not found");
        return tx.vote.findUnique({
          where: { userId_mapId: { userId, mapId } },
          select: voteSelect,
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("Vote storage is unavailable");
    }
  }

  async upsert(
    userId: string,
    mapId: string,
    input: UpsertVoteDto,
  ): Promise<VoteDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Shared row locks keep eligibility stable until the vote commits.
        for (const [table, id, label] of [
          [Prisma.sql`maps`, mapId, "Map"],
          [Prisma.sql`agents`, input.agentId, "Agent"],
          [Prisma.sql`weapons`, input.weaponId, "Weapon"],
        ] as const) {
          const [item] = await tx.$queryRaw<{ isActive: boolean }[]>(
            Prisma.sql`SELECT is_active AS "isActive" FROM ${table} WHERE id = ${id}::uuid FOR SHARE`,
          );
          if (!item) throw new NotFoundException(`${label} not found`);
          if (!item.isActive)
            throw new UnprocessableEntityException(`${label} is inactive`);
        }

        // ON CONFLICT serializes concurrent writes; WHERE avoids even touching unchanged rows.
        const [saved] = await tx.$queryRaw<VoteDto[]>`
          INSERT INTO votes (id, user_id, map_id, agent_id, weapon_id, created_at, updated_at)
          VALUES (${randomUUID()}::uuid, ${userId}::uuid, ${mapId}::uuid,
            ${input.agentId}::uuid, ${input.weaponId}::uuid, clock_timestamp(), clock_timestamp())
          ON CONFLICT (user_id, map_id) DO UPDATE
          SET agent_id = EXCLUDED.agent_id, weapon_id = EXCLUDED.weapon_id, updated_at = clock_timestamp()
          WHERE votes.agent_id IS DISTINCT FROM EXCLUDED.agent_id
             OR votes.weapon_id IS DISTINCT FROM EXCLUDED.weapon_id
          RETURNING id, map_id AS "mapId", agent_id AS "agentId", weapon_id AS "weaponId",
            created_at AS "createdAt", updated_at AS "updatedAt"
        `;
        // The conflict still holds the row lock when the unchanged row is not returned.
        return (
          saved ??
          (await tx.vote.findUniqueOrThrow({
            where: { userId_mapId: { userId, mapId } },
            select: voteSelect,
          }))
        );
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnprocessableEntityException
      )
        throw error;
      throw new ServiceUnavailableException("Vote storage is unavailable");
    }
  }
}
