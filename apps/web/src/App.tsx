import { IconArrowUpRight } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { SessionNotice } from '@/modules/auth/session';
import { useAuth } from '@/modules/auth/store';
import { cn } from '@/lib/utils';
import { AuthPage } from '@/pages/auth';
import { MapDetailPage } from '@/pages/map-detail';
import { MapsPage } from '@/pages/maps';

const containerClassName =
  'mx-auto w-[calc(100%-96px)] max-w-[1280px] max-[1000px]:w-[calc(100%-48px)] max-sm:w-[calc(100%-40px)]';

const pageTitles: Record<string, string> = {
  '/': 'Mapas',
  '/login': 'Iniciar sesión',
  '/register': 'Crear cuenta',
};

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const title = pathname.startsWith('/maps/')
      ? 'Detalle del mapa'
      : (pageTitles[pathname] ?? 'Mapas');

    document.title = `${title} — Valorant Community`;
    mainRef.current?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="fixed -top-25 left-4 z-50 bg-foreground p-3 text-background focus:top-3"
      >
        Saltar al contenido
      </a>

      <SiteHeader />

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className={cn(
          containerClassName,
          'flex-1 pb-20 focus:outline-none max-sm:pb-12',
        )}
      >
        {pathname === '/' && <SessionNotice />}

        <Routes>
          <Route path="/" element={<MapsPage />} />
          <Route path="/maps/:mapId" element={<MapDetailPage />} />
          <Route path="/login" element={<AuthPage type="login" />} />
          <Route path="/register" element={<AuthPage type="register" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-white/5 bg-background/90 backdrop-blur-lg">
      <div
        className={cn(
          containerClassName,
          'flex min-h-24 items-center justify-between gap-6 max-sm:min-h-26 max-sm:flex-wrap max-sm:gap-4.5 max-sm:py-5',
        )}
      >
        <Link
          to="/"
          className="text-[19px] leading-[1.15] font-extrabold tracking-[0.07em] transition-colors hover:text-destructive max-sm:text-base"
          aria-label="Valorant Community — inicio"
        >
          VALORANT
          <span className="mt-1.5 block text-[9px] tracking-[0.36em] text-muted-foreground">
            COMMUNITY
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="flex items-center gap-7 text-[13px] font-medium max-sm:w-full max-sm:justify-between max-sm:gap-1 max-sm:text-xs max-sm:[&_a]:text-xs"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: 'ghost' }),
                'mr-6 h-8 px-2.5 max-sm:mr-0',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            Mapas
          </NavLink>

          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}

function HeaderAuth() {
  const { user, status, logout } = useAuth();

  const badgeClassName =
    'max-w-45 truncate text-muted-foreground max-sm:max-w-25';

  if (status === 'authenticated' && user) {
    return (
      <>
        <Badge
          variant="secondary"
          className={badgeClassName}
          title={user.username}
        >
          {user.username}
        </Badge>

        <Button variant="secondary" onClick={logout}>
          Cerrar sesión
        </Button>
      </>
    );
  }

  if (status === 'checking') {
    return (
      <Badge variant="outline" className={badgeClassName} role="status">
        Verificando…
      </Badge>
    );
  }

  if (status === 'error') {
    return (
      <Badge variant="outline" className={badgeClassName}>
        Sesión pendiente
      </Badge>
    );
  }

  return (
    <>
      <Link
        to="/login"
        className={cn(buttonVariants({ variant: 'ghost' }), 'h-8 px-2.5')}
      >
        Iniciar sesión
      </Link>

      <Link
        to="/register"
        className={cn(
          buttonVariants(),
          'h-8 gap-3 border-border px-4 py-3 hover:bg-secondary hover:text-foreground max-sm:gap-1 max-sm:p-2.5',
        )}
      >
        Crear cuenta
        <IconArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </>
  );
}

function SiteFooter() {
  return (
    <footer
      className={cn(
        containerClassName,
        'flex items-center justify-between gap-6 border-t py-7 text-xs max-sm:items-start',
      )}
    >
      <p className="text-muted-foreground max-sm:max-w-52.5">Prueba técnica</p>

      <a
        href="https://nicoo.dev"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 whitespace-nowrap text-sm transition-colors hover:text-destructive"
      >
        — nicoo 🐐
        <IconArrowUpRight size={14} aria-hidden="true" />
      </a>
    </footer>
  );
}
