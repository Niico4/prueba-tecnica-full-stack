import { Prisma } from "../../generated/prisma/client.js";
import { STANDARD_MAPS } from "./catalog-baseline.js";
import { ValorantSnapshot, ValorantWeapon } from "./valorant.schemas.js";
export const WEAPON_CATEGORIES: Readonly<Record<string, string>> = {
  "EEquippableCategory::Heavy": "Heavy Weapons",
  "EEquippableCategory::Rifle": "Assault Rifles",
  "EEquippableCategory::Shotgun": "Shotguns",
  "EEquippableCategory::Sidearm": "Sidearms",
  "EEquippableCategory::Sniper": "Sniper Rifles",
  "EEquippableCategory::SMG": "SMGs",
  "EEquippableCategory::Melee": "Melee",
};
export function weaponCategory(weapon: ValorantWeapon): string {
  const category =
    weapon.shopData?.categoryText?.trim() || WEAPON_CATEGORIES[weapon.category];
  if (!category) throw new Error(`Unmapped weapon category for ${weapon.uuid}`);
  return category;
}
export function mapSnapshot(snapshot: ValorantSnapshot) {
  const maps = snapshot.maps
    .filter((map) => Object.hasOwn(STANDARD_MAPS, map.uuid))
    .map(
      (map) =>
        ({
          id: map.uuid,
          displayName: map.displayName,
          tacticalDescription: map.tacticalDescription,
          displayIcon: map.displayIcon,
          splash: map.splash,
          isActive: true,
        }) satisfies Prisma.mapCreateManyInput,
    );
  const roles = new Map<string, Prisma.agentRoleCreateManyInput>();
  const abilities: Prisma.agentAbilityCreateManyInput[] = [];
  const agents = snapshot.agents
    .filter((agent) => agent.isPlayableCharacter)
    .map((agent) => {
      if (!agent.role)
        throw new Error(`Playable agent ${agent.uuid} has no role`);
      const role = {
        id: agent.role.uuid,
        displayName: agent.role.displayName,
        description: agent.role.description,
        displayIcon: agent.role.displayIcon,
      };
      const previous = roles.get(role.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(role))
        throw new Error("Conflicting definitions for the same agent role");
      roles.set(role.id, role);
      for (const ability of agent.abilities)
        abilities.push({ agentId: agent.uuid, ...ability });
      return {
        id: agent.uuid,
        roleId: role.id,
        displayName: agent.displayName,
        description: agent.description,
        displayIcon: agent.displayIcon,
        fullPortrait: agent.fullPortrait,
        background: agent.background,
        backgroundGradientColors: agent.backgroundGradientColors,
        isActive: true,
      } satisfies Prisma.agentCreateManyInput;
    });
  const damageRanges: Prisma.weaponDamageRangeCreateManyInput[] = [];
  const weapons = snapshot.weapons.map((weapon) => {
    for (const range of weapon.weaponStats?.damageRanges ?? [])
      damageRanges.push({ weaponId: weapon.uuid, ...range });
    return {
      id: weapon.uuid,
      displayName: weapon.displayName,
      displayIcon: weapon.displayIcon,
      category: weaponCategory(weapon),
      cost: weapon.shopData?.cost ?? null,
      isActive: true,
    } satisfies Prisma.weaponCreateManyInput;
  });
  if (!maps.length || !agents.length || !weapons.length)
    throw new Error("Eligible catalogs must not be empty");
  return {
    maps,
    roles: [...roles.values()],
    agents,
    abilities,
    weapons,
    damageRanges,
  };
}
