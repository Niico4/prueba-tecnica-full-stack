import { IconArrowUpRight } from '@tabler/icons-react';
import { Link } from 'react-router';
import { MapPreviewDialog } from '@/components/map-preview-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import type { ValorantMap } from '@/modules/maps/api';

type MapCardProps = { map: ValorantMap; number: number; priority: boolean };

export const MapCard = ({ map, number, priority }: MapCardProps) => {
  return (
    <Dialog>
      <Card className="group relative min-w-0 gap-0 overflow-hidden rounded-xl p-0 transition-colors hover:border-muted-foreground focus-within:border-ring">
        <div className="relative aspect-4/3 overflow-hidden bg-muted">
          {map.splash ? (
            <img
              src={map.splash}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Imagen no disponible
            </p>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <span
              className="mb-3 block text-xs tabular-nums text-white/70"
              aria-hidden="true"
            >
              {String(number).padStart(2, '0')}
            </span>
            <h3 className="text-3xl font-medium tracking-tight">
              <Link
                to={`/maps/${map.id}`}
                className="hover:underline underline-offset-4"
              >
                {map.displayName}
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {map.tacticalDescription || 'Escenario de VALORANT'}
            </p>
          </div>
        </div>
        <DialogTrigger
          render={<Button variant="ghost" />}
          className="h-12 w-full justify-between rounded-none border-t px-5 text-xs text-muted-foreground hover:text-foreground"
          aria-label={`Ver vista previa de ${map.displayName}`}
        >
          Vista previa <IconArrowUpRight aria-hidden="true" />
        </DialogTrigger>
      </Card>
      <MapPreviewDialog map={map} />
    </Dialog>
  );
};
