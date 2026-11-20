import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import {
  EXPECTED_AGENTS,
  EXPECTED_WEAPONS,
  STANDARD_MAPS,
} from "./catalog-baseline.js";
import { ValorantClient } from "./valorant.client.js";
import { mapSnapshot } from "./valorant.mappers.js";

@Injectable()
export class ValorantSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ValorantClient,
  ) {}
  async synchronize(retireIds: string[] = []) {
    return this.prisma.$transaction(
      async (tx) => {
        // Lock before fetching so two CLI runs cannot persist snapshots out of order.
        const [lock] = await tx.$queryRaw<
          Array<{ locked: boolean }>
        >`SELECT pg_try_advisory_xact_lock(8042026) AS locked`;
        if (!lock?.locked)
          throw new Error("Another catalog synchronization is running");
        const catalog = mapSnapshot(await this.client.fetchSnapshot());
        const active = {
          maps: await tx.map.findMany({
            where: { isActive: true },
            select: { id: true },
          }),
          agents: await tx.agent.findMany({
            where: { isActive: true },
            select: { id: true },
          }),
          weapons: await tx.weapon.findMany({
            where: { isActive: true },
            select: { id: true },
          }),
        };
        const baseline = {
          maps: STANDARD_MAPS,
          agents: EXPECTED_AGENTS,
          weapons: EXPECTED_WEAPONS,
        };
        const missing = new Set<string>();
        for (const kind of ["maps", "agents", "weapons"] as const) {
          const incoming = new Set(catalog[kind].map((item) => item.id));
          for (const id of new Set([
            ...Object.keys(baseline[kind]),
            ...active[kind].map((item) => item.id),
          ])) {
            if (!incoming.has(id)) missing.add(id);
          }
        }
        const approved = new Set(retireIds.map((id) => id.toLowerCase()));
        if (
          missing.size !== approved.size ||
          [...missing].some((id) => !approved.has(id))
        ) {
          throw new Error(
            `Catalog incomplete or removals need review. Expected exact --retire-id list: ${[...missing].sort().join(", ") || "(none)"}. No data changed.`,
          );
        }
        for (const role of catalog.roles)
          await tx.agentRole.upsert({
            where: { id: role.id },
            create: role,
            update: role,
          });
        for (const map of catalog.maps)
          await tx.map.upsert({
            where: { id: map.id },
            create: map,
            update: map,
          });
        for (const agent of catalog.agents)
          await tx.agent.upsert({
            where: { id: agent.id },
            create: agent,
            update: agent,
          });
        for (const weapon of catalog.weapons)
          await tx.weapon.upsert({
            where: { id: weapon.id },
            create: weapon,
            update: weapon,
          });
        // Replace only validated collections of incoming owners, within this transaction.
        await tx.agentAbility.deleteMany({
          where: { agentId: { in: catalog.agents.map((item) => item.id) } },
        });
        await tx.agentAbility.createMany({ data: catalog.abilities });
        await tx.weaponDamageRange.deleteMany({
          where: { weaponId: { in: catalog.weapons.map((item) => item.id) } },
        });
        if (catalog.damageRanges.length)
          await tx.weaponDamageRange.createMany({ data: catalog.damageRanges });
        const retiredMaps = await tx.map.updateMany({
          where: {
            id: {
              in: [...approved],
              notIn: catalog.maps.map((item) => item.id),
            },
            isActive: true,
          },
          data: { isActive: false },
        });
        const retiredAgents = await tx.agent.updateMany({
          where: {
            id: {
              in: [...approved],
              notIn: catalog.agents.map((item) => item.id),
            },
            isActive: true,
          },
          data: { isActive: false },
        });
        const retiredWeapons = await tx.weapon.updateMany({
          where: {
            id: {
              in: [...approved],
              notIn: catalog.weapons.map((item) => item.id),
            },
            isActive: true,
          },
          data: { isActive: false },
        });
        return {
          maps: catalog.maps.length,
          roles: catalog.roles.length,
          agents: catalog.agents.length,
          abilities: catalog.abilities.length,
          weapons: catalog.weapons.length,
          damageRanges: catalog.damageRanges.length,
          retired:
            retiredMaps.count + retiredAgents.count + retiredWeapons.count,
        };
      },
      { timeout: 120000, maxWait: 5000 },
    );
  }
}
