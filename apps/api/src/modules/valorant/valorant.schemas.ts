import { z } from "zod";
import { CATALOG_ID_PATTERN } from "../../common/catalog-id.pipe.js";

const id = z
  .string()
  .regex(CATALOG_ID_PATTERN)
  .transform((value) => value.toLowerCase());
const name = (max: number) => z.string().min(1).max(max);
const image = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//.test(value))
  .nullable();
const text = z.string();
const integer = z.number().int().nonnegative().max(2147483647);
const damage = z.number().finite().nonnegative();
export const roleSchema = z.object({
  uuid: id,
  displayName: name(50),
  description: text,
  displayIcon: image,
});
export const abilitySchema = z.object({
  slot: name(50),
  displayName: name(100),
  description: text,
  displayIcon: image,
});
export const mapSchema = z.object({
  uuid: id,
  displayName: name(100),
  tacticalDescription: text.nullable(),
  displayIcon: image,
  splash: image,
});
export const agentSchema = z
  .object({
    uuid: id,
    displayName: name(100),
    description: text,
    displayIcon: image,
    fullPortrait: image,
    background: image,
    backgroundGradientColors: z.array(z.string().regex(/^[0-9a-f]{8}$/i)),
    isPlayableCharacter: z.boolean(),
    role: roleSchema.nullable(),
    abilities: z.array(abilitySchema).min(1),
  })
  .superRefine((agent, ctx) => {
    if (agent.isPlayableCharacter && !agent.role)
      ctx.addIssue({
        code: "custom",
        message: "Playable agent requires a role",
      });
    if (
      new Set(agent.abilities.map((ability) => ability.slot)).size !==
      agent.abilities.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate ability slots" });
  });
export const damageRangeSchema = z
  .object({
    rangeStartMeters: integer,
    rangeEndMeters: integer,
    headDamage: damage,
    bodyDamage: damage,
    legDamage: damage,
  })
  .refine(
    (range) => range.rangeEndMeters > range.rangeStartMeters,
    "Range end must exceed start",
  );
export const weaponSchema = z
  .object({
    uuid: id,
    displayName: name(100),
    displayIcon: image,
    category: name(100),
    shopData: z
      .object({
        cost: integer.nullable(),
        categoryText: z.string().max(100).nullable(),
      })
      .nullable(),
    weaponStats: z
      .object({ damageRanges: z.array(damageRangeSchema) })
      .nullable(),
  })
  .refine((weapon) => {
    const ranges = weapon.weaponStats?.damageRanges ?? [];
    return (
      new Set(
        ranges.map(
          (range) => `${range.rangeStartMeters}:${range.rangeEndMeters}`,
        ),
      ).size === ranges.length
    );
  }, "Duplicate damage ranges");
function response<T extends z.ZodType>(schema: T) {
  return z.object({ status: z.literal(200), data: z.array(schema).min(1) });
}
export const mapsResponseSchema = response(mapSchema);
export const agentsResponseSchema = response(agentSchema);
export const weaponsResponseSchema = response(weaponSchema);
export type ValorantMap = z.infer<typeof mapSchema>;
export type ValorantAgent = z.infer<typeof agentSchema>;
export type ValorantWeapon = z.infer<typeof weaponSchema>;
export interface ValorantSnapshot {
  maps: ValorantMap[];
  agents: ValorantAgent[];
  weapons: ValorantWeapon[];
}
export function parseSnapshot(
  maps: unknown,
  agents: unknown,
  weapons: unknown,
): ValorantSnapshot {
  const snapshot = {
    maps: mapsResponseSchema.parse(maps).data,
    agents: agentsResponseSchema.parse(agents).data,
    weapons: weaponsResponseSchema.parse(weapons).data,
  };
  for (const rows of Object.values(snapshot)) {
    if (new Set(rows.map((row) => row.uuid)).size !== rows.length)
      throw new Error("Duplicate catalog UUIDs");
  }
  return snapshot;
}
