import {
  IconAlertCircle,
  IconArrowRight,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { type SubmitEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/lib/api';
import { login, register } from '@/modules/auth/api';
import { internalDestination, SessionNotice } from '@/modules/auth/session';
import { useAuth } from '@/modules/auth/store';
import { validatePassword } from '@/utils/validate-password';

type AuthType = 'login' | 'register';
type AuthProps = { type: AuthType };

export const AuthPage = ({ type }: AuthProps) => {
  const [params] = useSearchParams();
  const status = useAuth((state) => state.status);

  const isRegister = type === 'register';
  const destination = internalDestination(params.get('next'));
  const switchPath = isRegister ? '/login' : '/register';

  if (status === 'authenticated') {
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 py-10 md:grid-cols-2 md:gap-12 lg:gap-20 lg:py-16">
      <AuthStory />

      <section
        className="w-full max-w-md justify-self-center border-t pt-8 md:border-0 md:pt-0"
        aria-labelledby="auth-title"
      >
        <p className="eyebrow mb-4">
          {isRegister ? 'CREA TU CUENTA' : 'BIENVENIDO DE NUEVO'}
        </p>

        <h2
          id="auth-title"
          className="text-[32px] leading-[1.2] font-medium tracking-[-0.045em] max-sm:text-[29px]"
        >
          {isRegister ? 'Únete a la comunidad.' : 'Vuelve al juego.'}
        </h2>

        <p className="mt-3 mb-8 text-sm text-muted-foreground">
          {isRegister
            ? 'Tu próximo punto de partida está aquí.'
            : 'Inicia sesión con tu usuario o email.'}
        </p>

        {status === 'checking' || status === 'error' ? (
          <SessionNotice />
        ) : (
          <AuthForm key={type} type={type} />
        )}

        <p className="mt-7 border-t pt-6 text-xs text-muted-foreground">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Es tu primera visita?'}{' '}
          <Link
            className="ml-1 text-foreground underline underline-offset-4 transition-colors hover:text-destructive"
            to={`${switchPath}?next=${encodeURIComponent(destination)}`}
          >
            {isRegister ? 'Inicia sesión' : 'Crea una cuenta'}
          </Link>
        </p>
      </section>
    </div>
  );
};

function AuthStory() {
  return (
    <aside className="md:border-r md:pr-10 lg:pr-14">
      <p className="eyebrow">VALORANT / COMMUNITY</p>

      <h1 className="text-[clamp(40px,4vw,58px)] leading-[1.07] font-semibold tracking-[-0.055em] max-sm:text-[38px]">
        Tu juego.
        <br />
        <span className="text-muted-foreground">Tu comunidad.</span>
      </h1>

      <p className="mt-6 text-sm leading-[1.8] text-muted-foreground max-md:hidden">
        Un lugar para explorar los mapas
        <br />y compartir tu forma de jugar.
      </p>

      <div
        className="relative mt-10 min-h-47.5 overflow-hidden border-l-2 border-primary bg-card p-6 max-md:hidden"
        aria-hidden="true"
      >
        <span className="text-[9px] tracking-[0.18em] text-muted-foreground">
          01 / EXPLORA
        </span>

        <strong className="relative mt-12 block text-[22px] leading-[1.3] font-medium tracking-[-0.03em]">
          Un mismo mapa.
          <br />
          Mil posibilidades.
        </strong>
      </div>

      <Link
        to="/"
        className="mt-7 inline-flex items-center gap-4 text-[13px] transition-colors hover:text-destructive max-sm:mt-4"
      >
        Explorar mapas <IconArrowRight size={17} aria-hidden="true" />
      </Link>
    </aside>
  );
}

function AuthForm({ type }: AuthProps) {
  const isRegister = type === 'register';
  const startSession = useAuth((state) => state.login);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const requestRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requestRef.current) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const validationError = validatePassword(password, isRegister);

    if (validationError) {
      setError(validationError);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setIsSubmitting(true);
    setError('');

    try {
      const response = isRegister
        ? await register(
            {
              username: String(formData.get('username') ?? '').trim(),
              email: String(formData.get('email') ?? '').trim(),
              password,
            },
            controller.signal,
          )
        : await login(
            {
              identifier: String(formData.get('identifier') ?? '').trim(),
              password,
            },
            controller.signal,
          );

      if (!controller.signal.aborted) {
        await startSession(response.accessToken);
      }
    } catch (caughtError) {
      if (!controller.signal.aborted) {
        setError(errorMessage(caughtError));
      }
    } finally {
      requestRef.current = null;

      if (!controller.signal.aborted) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <FieldSet disabled={isSubmitting}>
        <FieldGroup className="gap-5">
          {isRegister ? (
            <>
              <Field>
                <FieldLabel htmlFor="username">Usuario</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  className="h-11 bg-background/50"
                  autoComplete="username"
                  placeholder="Tu nombre en la comunidad"
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-zA-Z0-9_]+"
                  aria-describedby="username-hint"
                />
                <FieldDescription id="username-hint">
                  3–50 caracteres: letras, números o guion bajo.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="h-11 bg-background/50"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  required
                  maxLength={255}
                />
              </Field>
            </>
          ) : (
            <Field>
              <FieldLabel htmlFor="identifier">Usuario o email</FieldLabel>
              <Input
                id="identifier"
                name="identifier"
                className="h-11 bg-background/50"
                autoComplete="username"
                placeholder="Tu usuario o email"
                required
                maxLength={255}
              />
            </Field>
          )}

          <PasswordField isRegister={isRegister} />
        </FieldGroup>

        {error && (
          <Alert
            ref={errorRef}
            variant="destructive"
            role="alert"
            tabIndex={-1}
          >
            <IconAlertCircle aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="mt-1 h-12 w-full justify-between">
          {isSubmitting ? (
            <>
              <Spinner aria-label="Conectando" />
              Conectando…
            </>
          ) : (
            <>
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              <IconArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </FieldSet>
    </form>
  );
}

function PasswordField({ isRegister }: { isRegister: boolean }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field>
      <FieldLabel htmlFor="password">Contraseña</FieldLabel>

      <InputGroup className="h-11 bg-background/50">
        <InputGroupInput
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder={
            isRegister ? 'Crea una contraseña segura' : 'Tu contraseña'
          }
          required
          minLength={isRegister ? 12 : 1}
          maxLength={72}
          aria-describedby={isRegister ? 'password-hint' : undefined}
        />

        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-xs"
            aria-label={
              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <IconEyeOff /> : <IconEye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {isRegister && (
        <FieldDescription id="password-hint">
          Mínimo 12 caracteres.
        </FieldDescription>
      )}
    </Field>
  );
}
