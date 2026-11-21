import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { type ChangeEvent, useEffect, useState } from 'react';
import { MapCard } from '@/components/map-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { getMaps, type ValorantMap } from '@/modules/maps/api';
import { errorMessage } from '@/lib/api';

export function MapsPage() {
  const [maps, setMaps] = useState<ValorantMap[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount triggers a new request.
  useEffect(() => {
    const controller = new AbortController();

    async function loadMaps() {
      try {
        const data = await getMaps(controller.signal);

        if (!controller.signal.aborted) {
          setMaps(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(errorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMaps();

    return () => controller.abort();
  }, [retryCount]);

  function retry() {
    setLoading(true);
    setError('');
    setRetryCount((count) => count + 1);
  }

  const search = query.trim().toLowerCase();
  const filteredMaps = maps.filter((map) =>
    map.displayName.toLowerCase().includes(search),
  );

  return (
    <>
      <section className="flex items-end justify-between gap-8 pt-20 pb-16 max-sm:block max-sm:pt-11 max-sm:pb-8">
        <div>
          <p className="eyebrow">VALORANT / COMMUNITY</p>
          <h1 className="text-[clamp(38px,4.3vw,62px)] leading-[1.07] font-semibold tracking-[-0.055em]">
            Cada mapa.
            <br />
            <span className="text-muted-foreground">Otra forma de jugar.</span>
          </h1>
        </div>

        <p className="pb-1 text-sm leading-[1.8] text-muted-foreground max-[1000px]:max-w-57.5 max-sm:mt-6 max-sm:max-w-none">
          Explora los escenarios de VALORANT.
          <br />
          Encuentra tu próximo campo de juego.
        </p>
      </section>

      <section aria-labelledby="catalog-title">
        <div className="flex items-center justify-between gap-6 border-t py-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-4.5">
          <div className="flex items-center gap-3.5">
            <h2
              id="catalog-title"
              className="text-[17px] font-medium tracking-[-0.02em]"
            >
              Explora los mapas
            </h2>

            {!loading && !error && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {String(maps.length).padStart(2, '0')}
              </span>
            )}
          </div>

          <InputGroup className="w-full min-[641px]:max-w-xs">
            <label className="sr-only" htmlFor="map-search">
              Buscar mapa por nombre
            </label>

            <InputGroupInput
              id="map-search"
              type="search"
              placeholder="Buscar un mapa…"
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
            />

            <InputGroupAddon align="inline-start">
              <IconSearch aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
        </div>

        {loading ? (
          <div role="status">
            <span className="sr-only">Cargando mapas…</span>

            <div
              className="grid grid-cols-3 gap-x-6 gap-y-8 max-[1000px]:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-7"
              aria-hidden="true"
            >
              {[1, 2, 3, 4, 5, 6].map((id) => (
                <Skeleton
                  key={id}
                  className="aspect-[1.35] rounded-[10px] bg-card animation-duration-[1.5s]"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive" role="alert">
            <IconAlertCircle aria-hidden="true" />
            <AlertTitle>No pudimos cargar los mapas</AlertTitle>

            <AlertDescription>
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={retry}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : filteredMaps.length === 0 ? (
          <Empty role="status">
            <EmptyHeader>
              <EmptyTitle>
                {maps.length
                  ? 'No encontramos ese mapa'
                  : 'El catálogo aún está vacío'}
              </EmptyTitle>

              <EmptyDescription>
                {maps.length
                  ? 'Prueba con otro nombre o vuelve a ver todos.'
                  : 'Vuelve más tarde para explorar los escenarios.'}
              </EmptyDescription>
            </EmptyHeader>

            {query && (
              <EmptyContent>
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Limpiar búsqueda
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <>
            <p className="sr-only" role="status">
              {filteredMaps.length} mapas encontrados
            </p>

            <div className="grid grid-cols-3 gap-x-6 gap-y-8 max-[1000px]:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-7">
              {filteredMaps.map((map, index) => (
                <MapCard
                  key={map.id}
                  map={map}
                  number={maps.indexOf(map) + 1}
                  priority={index < 3}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
