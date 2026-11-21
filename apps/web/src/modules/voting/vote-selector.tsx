import { RadioGroup } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentOption } from "./agent-option";
import type { Agent, Weapon } from "./types";
import { WeaponOption } from "./weapon-option";

interface VoteSelectorProps {
  agents: Agent[];
  weapons: Weapon[];
  agentId: string;
  weaponId: string;
  disabled: boolean;
  onAgent: (id: string) => void;
  onWeapon: (id: string) => void;
}

export const VoteSelector = ({
  agents,
  weapons,
  agentId,
  weaponId,
  disabled,
  onAgent,
  onWeapon,
}: VoteSelectorProps) => {
  return (
    <Tabs defaultValue="agents">
      <TabsList className="mb-6" aria-label="Tipo de favorito">
        <TabsTrigger value="agents">01 · Agente</TabsTrigger>
        <TabsTrigger value="weapons">02 · Arma</TabsTrigger>
      </TabsList>

      <TabsContent value="agents">
        <h2 className="mb-2 text-2xl font-medium tracking-tight">
          ¿Con quién juegas este mapa?
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Elige un agente. Puedes cambiarlo antes de guardar.
        </p>

        {agents.length === 0 && (
          <p role="status">No hay agentes disponibles.</p>
        )}

        <RadioGroup
          aria-label="Agente favorito"
          value={agentId}
          onValueChange={onAgent}
          disabled={disabled}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
        >
          {agents.map((agent) => (
            <AgentOption
              key={agent.id}
              agent={agent}
              selected={agentId === agent.id}
            />
          ))}
        </RadioGroup>
      </TabsContent>

      <TabsContent value="weapons">
        <h2 className="mb-2 text-2xl font-medium tracking-tight">
          Tu arma de confianza.
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Selecciona una para completar tu voto.
        </p>

        {weapons.length === 0 && <p role="status">No hay armas disponibles.</p>}

        <RadioGroup
          aria-label="Arma favorita"
          value={weaponId}
          onValueChange={onWeapon}
          disabled={disabled}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {weapons.map((weapon) => (
            <WeaponOption
              key={weapon.id}
              weapon={weapon}
              selected={weaponId === weapon.id}
            />
          ))}
        </RadioGroup>
      </TabsContent>
    </Tabs>
  );
};
