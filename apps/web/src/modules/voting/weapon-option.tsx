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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Weapon } from "./types";

interface WeaponOptionProps {
  weapon: Weapon;
  selected: boolean;
}

const formatDamage = (value: number) =>
  value.toLocaleString("es", { maximumFractionDigits: 2 });

export const WeaponOption = ({ weapon, selected }: WeaponOptionProps) => {
  const category = weapon.category.replace("EEquippableCategory::", "");

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
        htmlFor={`weapon-${weapon.id}`}
        className={cn(
          "flex flex-col items-start gap-2",
          weapon.isActive ? "cursor-pointer" : "cursor-not-allowed",
        )}
      >
        <div className="grid h-24 w-full place-items-center">
          {weapon.displayIcon && (
            <img
              src={weapon.displayIcon}
              alt=""
              className="max-h-20 w-full object-contain"
              loading="lazy"
            />
          )}
        </div>

        <span className="flex w-full items-center justify-between gap-2">
          <span>{weapon.displayName}</span>

          <RadioGroupItem
            id={`weapon-${weapon.id}`}
            value={weapon.id}
            disabled={!weapon.isActive}
          />
        </span>
      </Label>

      <p className="text-xs text-muted-foreground">
        {category}
        {!weapon.isActive && " · Retirada"}
      </p>

      <Dialog>
        <DialogTrigger
          render={<Button variant="ghost" size="sm" />}
          aria-label={`Información de ${weapon.displayName}`}
        >
          Ver detalles
        </DialogTrigger>

        <WeaponDetails weapon={weapon} category={category} />
      </Dialog>
    </Card>
  );
};

function WeaponDetails({
  weapon,
  category,
}: {
  weapon: Weapon;
  category: string;
}) {
  return (
    <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto bg-card p-5 sm:max-w-xl sm:p-8">
      <DialogHeader className="pr-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {category}
        </p>

        <DialogTitle className="text-4xl tracking-tight">
          {weapon.displayName}
        </DialogTitle>

        <DialogDescription>
          {weapon.cost === null
            ? "Información de compra no disponible"
            : `${weapon.cost.toLocaleString("es")} créditos`}
        </DialogDescription>
      </DialogHeader>

      {weapon.displayIcon && (
        <div className="flex h-40 items-center justify-center overflow-hidden border-y py-6 sm:h-48">
          <img
            src={weapon.displayIcon}
            alt={weapon.displayName}
            className="h-auto max-h-28 w-auto max-w-full object-contain sm:max-h-36"
          />
        </div>
      )}

      {weapon.damageRanges.length > 0 ? (
        <Table className="text-xs tabular-nums sm:text-sm">
          <TableCaption className="caption-top mb-4 text-left font-medium text-foreground">
            Daño por distancia
          </TableCaption>

          <TableHeader>
            <TableRow>
              <TableHead>Metros</TableHead>
              <TableHead className="text-right">Cabeza</TableHead>
              <TableHead className="text-right">Cuerpo</TableHead>
              <TableHead className="text-right">Piernas</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {weapon.damageRanges.map((range) => (
              <TableRow
                key={`${range.rangeStartMeters}-${range.rangeEndMeters}`}
              >
                <TableCell>
                  {range.rangeStartMeters}–{range.rangeEndMeters}
                </TableCell>
                <TableCell className="text-right">
                  {formatDamage(range.headDamage)}
                </TableCell>
                <TableCell className="text-right">
                  {formatDamage(range.bodyDamage)}
                </TableCell>
                <TableCell className="text-right">
                  {formatDamage(range.legDamage)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">
          Sin estadísticas de daño disponibles.
        </p>
      )}
    </DialogContent>
  );
}
