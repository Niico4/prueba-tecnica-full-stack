import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "./store";

export function internalDestination(value: string | null): string {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(value, window.location.origin);
    const isAuthPage = ["/login", "/register"].includes(url.pathname);

    if (url.origin !== window.location.origin || isAuthPage) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export const SessionNotice = () => {
  const { status, restore, logout } = useAuth();

  if (status === "checking") {
    return (
      <p
        role="status"
        className="flex flex-wrap items-center gap-4 py-4 text-[13px] text-muted-foreground"
      >
        Verificando tu sesión…
      </p>
    );
  }

  if (status !== "error") return null;

  return (
    <Alert className="flex flex-wrap items-center gap-4 rounded-none border-0 bg-transparent px-0 py-4">
      <AlertDescription>
        No pudimos verificar tu sesión. Puedes reintentar.
      </AlertDescription>

      <Button variant="secondary" onClick={() => void restore()}>
        Reintentar
      </Button>

      <Button variant="ghost" onClick={logout}>
        Cerrar sesión
      </Button>
    </Alert>
  );
};

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((state) => state.status);
  const location = useLocation();

  if (status === "checking" || status === "error") {
    return <SessionNotice />;
  }

  if (status === "anonymous") {
    const next = encodeURIComponent(
      location.pathname + location.search + location.hash,
    );

    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
