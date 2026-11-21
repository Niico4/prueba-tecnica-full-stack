export interface AgentRole {
  id: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface AgentAbility {
  slot: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface Agent {
  id: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
  isActive: boolean;
  role: AgentRole;
  abilities: AgentAbility[];
}

export interface WeaponDamageRange {
  rangeStartMeters: number;
  rangeEndMeters: number;
  headDamage: number;
  bodyDamage: number;
  legDamage: number;
}

export interface Weapon {
  id: string;
  displayName: string;
  displayIcon: string | null;
  category: string;
  cost: number | null;
  isActive: boolean;
  damageRanges: WeaponDamageRange[];
}

export interface Vote {
  id: string;
  mapId: string;
  agentId: string;
  weaponId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoteSelection {
  agentId: string;
  weaponId: string;
}
