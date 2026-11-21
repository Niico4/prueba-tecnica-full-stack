import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { cleanDescription } from "@/utils/clean-description";
import type { Agent } from "./types";

interface AgentOptionProps {
  agent: Agent;
  selected: boolean;
}

export const AgentOption = ({ agent, selected }: AgentOptionProps) => {
  return (
    <Card
      className={cn(
        "gap-2 p-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
        selected
          ? "border-primary bg-primary/10"
          : "hover:border-muted-foreground hover:bg-accent/40",
      )}
    >
      <Label
        htmlFor={`agent-${agent.id}`}
        className={cn(
          "flex flex-col items-start gap-2",
          agent.isActive ? "cursor-pointer" : "cursor-not-allowed",
        )}
      >
        <div className="grid h-24 w-full place-items-center">
          {agent.displayIcon && (
            <img
              src={agent.displayIcon}
              alt=""
              className="size-24 object-contain"
              loading="lazy"
            />
          )}
        </div>

        <span className="flex w-full items-center justify-between gap-2">
          <span className="min-w-0 leading-snug">{agent.displayName}</span>

          <RadioGroupItem
            id={`agent-${agent.id}`}
            value={agent.id}
            disabled={!agent.isActive}
          />
        </span>
      </Label>

      <p className="text-xs text-muted-foreground">
        {agent.role.displayName}
        {!agent.isActive && " · Retirado"}
      </p>

      <Dialog>
        <DialogTrigger
          render={<Button variant="ghost" size="sm" />}
          aria-label={`Información de ${agent.displayName}`}
        >
          Ver detalles
        </DialogTrigger>

        <AgentDetails agent={agent} />
      </Dialog>
    </Card>
  );
};

function AgentDetails({ agent }: { agent: Agent }) {
  return (
    <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto bg-card p-6 sm:max-w-3xl sm:p-8">
      <DialogHeader className="grid items-center gap-5 border-b pb-6 sm:grid-cols-[144px_minmax(0,1fr)]">
        {agent.displayIcon && (
          <img
            src={agent.displayIcon}
            alt=""
            className="size-28 object-contain sm:size-36"
          />
        )}

        <div className="min-w-0 space-y-3 pr-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {agent.role.displayIcon && (
              <img
                src={agent.role.displayIcon}
                alt=""
                className="size-4 object-contain"
              />
            )}
            {agent.role.displayName}
          </p>

          <DialogTitle className="text-4xl tracking-tight">
            {agent.displayName}
          </DialogTitle>

          <DialogDescription className="leading-relaxed">
            {cleanDescription(agent.description)}
          </DialogDescription>
        </div>
      </DialogHeader>

      <section aria-label="Habilidades">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Habilidades
        </h3>

        <div className="divide-y">
          {agent.abilities.map((ability) => (
            <div
              key={ability.slot}
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 py-5 sm:gap-5"
            >
              <div className="pt-1">
                {ability.displayIcon && (
                  <img
                    src={ability.displayIcon}
                    alt=""
                    className="size-10 object-contain"
                  />
                )}
              </div>

              <div>
                <h4 className="text-base font-medium">{ability.displayName}</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {cleanDescription(ability.description)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DialogContent>
  );
}
