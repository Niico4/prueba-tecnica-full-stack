import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionNotice } from '@/modules/auth/session';
import { useAuth } from '@/modules/auth/store';
import type { ValorantMap } from '@/modules/maps/api';
import {
  getCatalog,
  getHistoricalChoices,
  getVote,
  saveVote,
  votingError,
} from './api';
import type { Vote } from './types';
import { VoteSelector } from './vote-selector';

type Catalog = Awaited<ReturnType<typeof getCatalog>>;
type VoteHistory = Awaited<ReturnType<typeof getHistoricalChoices>>;
type VoteStatus = 'loading' | 'ready' | 'error';

interface VotingProps {
  map: ValorantMap;
  onSaved: () => void;
  onResults: () => void;
}

export const Voting = ({ map, onSaved, onResults }: VotingProps) => {
  const { status, token, logout } = useAuth();

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetry, setCatalogRetry] = useState(0);

  const [vote, setVote] = useState<Vote | null>(null);
  const [history, setHistory] = useState<VoteHistory | null>(null);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>(
    token ? 'loading' : 'ready',
  );
  const [voteRetry, setVoteRetry] = useState(0);

  const [agentId, setAgentId] = useState('');
  const [weaponId, setWeaponId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => saveRequest.current?.abort();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: catalogRetry triggers a new request.
  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const data = await getCatalog(controller.signal);

        if (controller.signal.aborted) return;

        setCatalog(data);
      } catch (error) {
        if (controller.signal.aborted) return;

        setCatalogError(votingError(error));
      }
    }

    void loadCatalog();

    return () => controller.abort();
  }, [catalogRetry]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: voteRetry triggers a new request.
  useEffect(() => {
    if (status !== 'authenticated' || !token) return;

    const authenticatedToken = token;
    const controller = new AbortController();

    setVoteStatus('loading');
    setError('');

    async function loadVote() {
      try {
        const currentVote = await getVote(
          map.id,
          authenticatedToken,
          controller.signal,
        );
        const historicalChoices = currentVote
          ? await getHistoricalChoices(currentVote, controller.signal)
          : null;

        if (controller.signal.aborted) return;

        setVote(currentVote);
        setHistory(historicalChoices);
        setAgentId(currentVote?.agentId ?? '');
        setWeaponId(currentVote?.weaponId ?? '');
        setVoteStatus('ready');
      } catch (error) {
        if (controller.signal.aborted) return;

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          logout();
          return;
        }

        setError(votingError(error));
        setVoteStatus('error');
      }
    }

    void loadVote();

    return () => controller.abort();
  }, [map.id, token, status, logout, voteRetry]);

  const agents = catalog?.agents ?? [];
  const weapons = catalog?.weapons ?? [];

  const agent = agents.find((item) => item.id === agentId);
  const weapon = weapons.find((item) => item.id === weaponId);

  const hasChanges = vote?.agentId !== agentId || vote?.weaponId !== weaponId;

  const validSelection =
    map.isActive && agent?.isActive === true && weapon?.isActive === true;

  const selectionDisabled =
    saving ||
    voteStatus !== 'ready' ||
    status === 'checking' ||
    status === 'error';

  const canSave =
    status === 'authenticated' &&
    Boolean(token) &&
    validSelection &&
    hasChanges &&
    !selectionDisabled;

  const agentName =
    agent?.displayName ||
    (history?.agent.id === agentId
      ? `${history.agent.displayName} · Retirado`
      : 'Sin seleccionar');

  const weaponName =
    weapon?.displayName ||
    (history?.weapon.id === weaponId
      ? `${history.weapon.displayName} · Retirada`
      : 'Sin seleccionar');

  function refreshCatalog() {
    setCatalog(null);
    setCatalogError('');
    setCatalogRetry((count) => count + 1);
  }

  function selectAgent(id: string) {
    setAgentId(id);
    setSuccess(false);
  }

  function selectWeapon(id: string) {
    setWeaponId(id);
    setSuccess(false);
  }

  async function handleSave() {
    if (!canSave || !token || saveRequest.current) return;

    const controller = new AbortController();
    saveRequest.current = controller;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const savedVote = await saveVote(
        map.id,
        token,
        { agentId, weaponId },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      setVote(savedVote);

      if (agent && weapon) {
        setHistory({ agent, weapon });
      }

      setSuccess(true);
      onSaved();
    } catch (error) {
      if (controller.signal.aborted) return;

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
      } else {
        setError(votingError(error));
      }
    } finally {
      if (saveRequest.current === controller) {
        saveRequest.current = null;
      }

      if (!controller.signal.aborted) {
        setSaving(false);
      }
    }
  }

  return (
    <>
      <SessionNotice />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          {catalogError ? (
            <Alert variant="destructive">
              <AlertDescription className="space-y-4">
                <p>{catalogError}</p>
                <Button variant="outline" onClick={refreshCatalog}>
                  Reintentar catálogo
                </Button>
              </AlertDescription>
            </Alert>
          ) : !catalog ? (
            <div role="status">
              <p className="mb-4 text-muted-foreground">
                Cargando agentes y armas…
              </p>
              <Skeleton className="h-64" />
            </div>
          ) : (
            <VoteSelector
              agents={agents}
              weapons={weapons}
              agentId={agentId}
              weaponId={weaponId}
              disabled={selectionDisabled}
              onAgent={selectAgent}
              onWeapon={selectWeapon}
            />
          )}
        </section>

        <Card className="gap-4 border bg-card/95 p-5 backdrop-blur-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-medium">Tu elección</h2>

          <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-1">
            <div>
              <dt className="text-xs text-muted-foreground">Agente</dt>
              <dd className="mt-1">{agentName}</dd>
            </div>

            <div>
              <dt className="text-xs text-muted-foreground">Arma</dt>
              <dd className="mt-1">{weaponName}</dd>
            </div>
          </dl>

          {!map.isActive && (
            <p className="text-sm text-destructive">
              Este mapa está retirado y no admite nuevos votos.
            </p>
          )}

          {status === 'anonymous' ? (
            <>
              <p className="text-xs text-muted-foreground">
                Inicia sesión para guardar tus favoritos.
              </p>

              <Link
                className={buttonVariants()}
                to={`/login?next=${encodeURIComponent(`/maps/${map.id}`)}`}
              >
                Iniciar sesión para votar
              </Link>
            </>
          ) : (
            <>
              {voteStatus === 'loading' && (
                <p role="status" className="text-sm">
                  Consultando tu voto…
                </p>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {voteStatus === 'error' ? (
                <Button
                  variant="outline"
                  onClick={() => setVoteRetry((count) => count + 1)}
                >
                  Reintentar consulta
                </Button>
              ) : (
                <Button onClick={() => void handleSave()} disabled={!canSave}>
                  {saving
                    ? 'Guardando…'
                    : !hasChanges
                      ? 'Voto guardado'
                      : vote
                        ? 'Actualizar voto'
                        : 'Guardar voto'}
                </Button>
              )}

              {success && (
                <p role="status" className="text-sm">
                  Tu voto se guardó correctamente.{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={onResults}
                  >
                    Ver resultados
                  </Button>
                </p>
              )}

              {vote && !validSelection && (
                <p className="text-xs text-muted-foreground">
                  Si un favorito fue retirado, elige un reemplazo activo antes
                  de actualizar.
                </p>
              )}
            </>
          )}

          <Button variant="ghost" size="sm" onClick={refreshCatalog}>
            Actualizar catálogo
          </Button>
        </Card>
      </div>
    </>
  );
};
