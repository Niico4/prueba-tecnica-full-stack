import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ValorantMap } from '@/modules/maps/api';

export const MapPreviewDialog = ({ map }: { map: ValorantMap }) => {
  return (
    <DialogContent className="w-[calc(100%-2rem)] max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto bg-card p-0 sm:max-w-4xl">
      <div className="grid sm:grid-cols-2">
        <div className="relative min-w-0">
          {map.splash && (
            <img
              className="h-48 w-full object-cover sm:absolute sm:h-full"
              src={map.splash}
              alt={`Escenario de ${map.displayName}`}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
          <DialogHeader className="relative -mt-24 p-6 pr-10 sm:mt-0 sm:flex sm:min-h-96 sm:justify-end sm:p-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Vista previa
            </p>
            <DialogTitle className="text-4xl tracking-tight">
              {map.displayName}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {map.tacticalDescription || 'Escenario de VALORANT'}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          {map.displayIcon && (
            <img
              className="mx-auto h-52 w-full object-contain sm:h-64"
              src={map.displayIcon}
              alt={`Plano de ${map.displayName}`}
            />
          )}
          <Link
            to={`/maps/${map.id}`}
            className={buttonVariants({ className: 'mt-auto w-full' })}
          >
            Explorar y votar
          </Link>
        </div>
      </div>
    </DialogContent>
  );
};
