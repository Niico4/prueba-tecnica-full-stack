import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/modules/auth/store';
import type { ValorantMap } from '@/modules/maps/api';
import { CommunityResults } from '@/modules/results/community-results';
import { getMap, votingError } from '@/modules/voting/api';
import { Voting } from '@/modules/voting/voting';
import { cn } from '@/lib/utils';

export const MapDetailPage = () => {
  const { mapId = '' } = useParams();

  return <MapDetail key={mapId} mapId={mapId} />;
};

function MapDetail({ mapId }: { mapId: string }) {
  const userId = useAuth((state) => state.user?.id);

  const [map, setMap] = useState<ValorantMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [resultsRevision, setResultsRevision] = useState(0);
  const [view, setView] = useState<string | number>('favorites');

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount triggers a new request.
  useEffect(() => {
    const controller = new AbortController();

    async function loadMap() {
      try {
        const data = await getMap(mapId, controller.signal);

        if (controller.signal.aborted) return;

        setMap(data);
        document.title = `${data.displayName} — Valorant Community`;
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(votingError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMap();

    return () => controller.abort();
  }, [mapId, retryCount]);

  function retry() {
    setLoading(true);
    setError('');
    setRetryCount((count) => count + 1);
  }

  return (
    <div className="pt-8">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Todos los mapas
      </Link>

      {loading ? (
        <div role="status" className="py-8">
          <span className="sr-only">Cargando mapa…</span>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <Alert className="mt-8" variant="destructive">
          <AlertDescription className="space-y-4">
            <p>{error}</p>
            <Button variant="outline" onClick={retry}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : map ? (
        <>
          <section
            className={cn(
              'my-8 grid overflow-hidden rounded-xl border bg-card',
              map.displayIcon && 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]',
            )}
          >
            <div className="relative flex min-h-72 items-end sm:min-h-88">
              {map.splash && (
                <img
                  src={map.splash}
                  alt={`Escenario de ${map.displayName}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />

              <div className="relative p-6 sm:p-8">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Explora el mapa
                </p>
                <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
                  {map.displayName}
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {map.tacticalDescription || 'Escenario de VALORANT'}
                </p>
              </div>
            </div>

            {map.displayIcon && (
              <div className="flex items-center justify-center p-6 sm:p-8">
                <img
                  src={map.displayIcon}
                  alt={`Minimapa de ${map.displayName}`}
                  className="h-60 w-full object-contain sm:h-72"
                />
              </div>
            )}
          </section>

          <Tabs value={view} onValueChange={setView}>
            <TabsList
              variant="line"
              className="mb-8 w-full justify-start border-b"
              aria-label="Secciones del mapa"
            >
              <TabsTrigger className="flex-none px-4" value="favorites">
                Elegir favoritos
              </TabsTrigger>
              <TabsTrigger className="flex-none px-4" value="results">
                Resultados
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="favorites"
              keepMounted
              className="data-hidden:hidden"
            >
              <Voting
                key={userId ?? 'public'}
                map={map}
                onSaved={() => setResultsRevision((count) => count + 1)}
                onResults={() => setView('results')}
              />
            </TabsContent>

            <TabsContent
              value="results"
              keepMounted
              className="data-hidden:hidden"
            >
              <CommunityResults
                mapId={map.id}
                refresh={resultsRevision}
                canVote={map.isActive}
                onVote={() => setView('favorites')}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
