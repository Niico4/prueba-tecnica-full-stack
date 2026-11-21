import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getResults, type MapResults, type RankedChoice } from "./api";

type ResultsStatus = "loading" | "ready" | "error";
type RankingKind = "agents" | "weapons";

interface CommunityResultsProps {
  mapId: string;
  refresh: number;
  canVote: boolean;
  onVote: () => void;
}

export const CommunityResults = ({
  mapId,
  refresh,
  canVote,
  onVote,
}: CommunityResultsProps) => {
  const [results, setResults] = useState<MapResults | null>(null);
  const [status, setStatus] = useState<ResultsStatus>("loading");
  const [retryCount, setRetryCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh and retryCount intentionally trigger reloads.
  useEffect(() => {
    const controller = new AbortController();

    async function loadResults() {
      setStatus("loading");
      setResults(null);

      try {
        const data = await getResults(mapId, controller.signal);

        if (controller.signal.aborted) return;

        setResults(data);
        setStatus("ready");
      } catch {
        if (controller.signal.aborted) return;

        setStatus("error");
      }
    }

    void loadResults();

    return () => controller.abort();
  }, [mapId, refresh, retryCount]);

  return (
    <section
      id="community-results"
      aria-labelledby="results-title"
      className="pb-8"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">LA COMUNIDAD ELIGE</p>

          <h2
            id="results-title"
            className="text-3xl font-medium tracking-tight"
          >
            Favoritos de este mapa
          </h2>

          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Los agentes y armas que prefieren quienes juegan aquí.
          </p>
        </div>

        {status === "ready" && results && (
          <p className="text-sm text-muted-foreground">
            <strong className="mr-2 text-2xl font-medium text-foreground tabular-nums">
              {results.totalVotes.toLocaleString("es")}
            </strong>
            {results.totalVotes === 1 ? "votación" : "votaciones"}
          </p>
        )}
      </div>

      <ResultsContent
        status={status}
        results={results}
        canVote={canVote}
        onVote={onVote}
        onRetry={() => setRetryCount((count) => count + 1)}
      />
    </section>
  );
};

interface ResultsContentProps {
  status: ResultsStatus;
  results: MapResults | null;
  canVote: boolean;
  onVote: () => void;
  onRetry: () => void;
}

function ResultsContent({
  status,
  results,
  canVote,
  onVote,
  onRetry,
}: ResultsContentProps) {
  if (status === "loading") {
    return (
      <div role="status">
        <span className="sr-only">Cargando resultados de la comunidad…</span>

        <div className="grid gap-8 md:grid-cols-2" aria-hidden="true">
          {["agents", "weapons"].map((group) => (
            <div key={group} className="space-y-4">
              <Skeleton className="h-6 w-28" />

              {[1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-20 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>No pudimos cargar los resultados</AlertTitle>
        <AlertDescription>
          <p>
            La consulta de resultados falló. Esto no cambia el estado de tu
            voto.
          </p>

          <Button variant="outline" className="mt-3" onClick={onRetry}>
            Reintentar resultados
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!results) return null;

  if (results.totalVotes === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Este mapa todavía no tiene votos</EmptyTitle>
          <EmptyDescription>
            {canVote
              ? "Comparte tus favoritos y abre la conversación."
              : "Todavía no hay preferencias registradas para este mapa."}
          </EmptyDescription>
        </EmptyHeader>

        {canVote && (
          <Button variant="secondary" onClick={onVote}>
            Elegir mis favoritos
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-8">
      <Ranking title="Agentes" items={results.agents} kind="agents" />
      <Ranking title="Armas" items={results.weapons} kind="weapons" />
    </div>
  );
}

interface RankingProps {
  title: string;
  items: RankedChoice[];
  kind: RankingKind;
}

function Ranking({ title, items, kind }: RankingProps) {
  const topVotes = items[0]?.votes;

  return (
    <section aria-labelledby={`${kind}-ranking-title`} className="min-w-0">
      <h3 id={`${kind}-ranking-title`} className="mb-3 text-lg font-medium">
        {title}
      </h3>

      <ol className="divide-y">
        {items.map((item, index) => {
          const isLeader = item.votes === topVotes;
          const percentage = item.percentage.toLocaleString("es", {
            maximumFractionDigits: 2,
          });
          const votes = item.votes.toLocaleString("es");

          return (
            <li
              key={item.id}
              className={cn(
                "grid grid-cols-[24px_56px_minmax(0,1fr)] items-center gap-3 py-5 sm:grid-cols-[28px_72px_minmax(0,1fr)]",
                isLeader && "border-l-2 border-l-primary pl-3",
              )}
            >
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="sr-only">Posición </span>
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="grid h-14 place-items-center">
                {item.displayIcon ? (
                  <img
                    src={item.displayIcon}
                    alt=""
                    loading="lazy"
                    className={
                      kind === "agents"
                        ? "size-14 object-contain"
                        : "max-h-12 w-full object-contain"
                    }
                  />
                ) : (
                  <span className="text-center text-xs text-muted-foreground">
                    Sin imagen
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="wrap-break-words text-sm font-medium">
                    {item.displayName}
                  </h4>

                  <span className="text-sm tabular-nums">{percentage}%</span>
                </div>

                <p className="mb-2 mt-1 text-xs text-muted-foreground">
                  {votes} {item.votes === 1 ? "voto" : "votos"}
                </p>

                <Progress
                  value={item.percentage}
                  aria-label={`Porcentaje de votos de ${item.displayName}`}
                  aria-valuetext={`${percentage} por ciento, ${votes} ${item.votes === 1 ? "voto" : "votos"}`}
                  className={
                    isLeader
                      ? undefined
                      : "**:data-[slot=progress-indicator]:bg-muted-foreground"
                  }
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
