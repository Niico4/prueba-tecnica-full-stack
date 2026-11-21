# Valorant Community

Aplicación web para explorar mapas, agentes y armas de **VALORANT**, elegir un agente y un arma favoritos por mapa y consultar las votaciones de la comunidad.

Desarrollada como parte de una [prueba técnica Full Stack](https://david-lucidbot.github.io/technical-test/).

## Tecnologías

| Área             | Tecnologías                                                      |
| ---------------- | ---------------------------------------------------------------- |
| Frontend         | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Axios, Zustand |
| Backend          | NestJS, TypeScript, JWT, bcrypt                                  |
| Datos            | PostgreSQL, Prisma                                               |
| Catálogo externo | [Valorant API](https://valorant-api.com/)                        |
| Herramientas     | pnpm Workspaces, Biome, Docker Compose                           |
| Pruebas y API    | Vitest, Supertest, Swagger / OpenAPI                             |

## Cómo ejecutar la aplicación

Hay **dos formas de ejecutar el proyecto**. Elige una según lo que necesites; **no es necesario seguir ambas**. Todos los comandos se ejecutan desde la **raíz del repositorio**.

- **Opción 1 — Docker:** levanta toda la aplicación sin instalar Node.js ni pnpm en tu computadora. **Recomendada para evaluar la prueba.**
- **Opción 2 — pnpm + PostgreSQL en Docker:** ejecuta React y NestJS desde el código fuente y utiliza Docker únicamente para la base de datos. **Recomendada para trabajar en el proyecto.**

Por defecto, la web utiliza `http://localhost:5173` y la API `http://localhost:3000/api`. Asegúrate de que esos puertos y el `5432` estén disponibles.

### Opción 1 — Ejecutar todo con Docker

**Requisitos:** Docker Desktop o Docker Engine con Compose v2, en ejecución, y conexión a Internet para construir las imágenes y sincronizar el catálogo.

**1. Configurar el entorno**

```bash
cp .env.example .env
openssl rand -hex 32
```

Copia el valor generado por el segundo comando en `JWT_SECRET` dentro del archivo `.env`. Conserva o ajusta los valores de PostgreSQL del ejemplo. El secreto debe tener al menos 32 bytes y no contener espacios adicionales.

**2. Construir e iniciar los servicios**

```bash
docker compose up -d --build --wait
```

Docker Compose inicia PostgreSQL, ejecuta las migraciones mediante el servicio `migrate` y levanta la API y el frontend compilado. **No hace falta ejecutar `pnpm install` ni aplicar migraciones manualmente.**

**3. Sincronizar el catálogo inicial**

```bash
docker compose exec -T api pnpm catalog:sync
```

Este paso importa mapas, agentes, roles, habilidades, armas y rangos de daño desde Valorant API. **Es necesario en una base de datos nueva**; sin él, los listados del catálogo estarán vacíos. La sincronización es manual y se puede repetir para actualizar los datos sin duplicarlos.

**4. Abrir y comprobar la aplicación**

Abre [http://localhost:5173](http://localhost:5173) y prueba la exploración de mapas, el registro, el inicio de sesión, la votación y los resultados.

Para comprobar la API:

```bash
curl --fail http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "up"
}
```

**Administrar contenedores**

```bash
docker compose ps -a           # Ver estado
docker compose logs -f api      # Ver logs de la API
docker compose logs -f web      # Ver logs del frontend
docker compose down             # Detener y eliminar contenedores
```

`docker compose down` **conserva** el volumen de PostgreSQL. Evita `docker compose down -v` salvo que quieras eliminar también los datos almacenados.

### Opción 2 — Ejecutar React y NestJS con pnpm

**Requisitos:** Node.js 24 (ver `.node-version`), pnpm 10.33.0 y Docker con Compose v2 para PostgreSQL.

En esta modalidad, **solo PostgreSQL se ejecuta en Docker**. React usa el servidor de desarrollo de Vite y NestJS se ejecuta desde pnpm. No levantes simultáneamente los servicios `api` y `web` de Compose, porque competirán por los mismos puertos.

**1. Configurar las variables de entorno**

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
openssl rand -hex 32
```

- En el `.env` de la raíz, configura `JWT_SECRET` con el valor generado y revisa las credenciales de PostgreSQL. `DATABASE_URL` debe conectar a PostgreSQL desde tu computadora, normalmente mediante `localhost:5432`, **no** mediante el nombre `db` de Docker.
- En `apps/web/.env`, verifica que `VITE_API_BASE_URL=http://localhost:3000/api`.

El backend usa la configuración raíz y Vite usa la de `apps/web`. Las variables `VITE_*` son públicas y se incluyen en el cliente: **no coloques secretos allí**.

**2. Instalar las dependencias de ambos workspaces**

```bash
pnpm install --frozen-lockfile
```

Es una sola instalación desde la raíz. pnpm instala las dependencias necesarias de `apps/api` y `apps/web`; no ejecutes instalaciones separadas dentro de cada carpeta.

**3. Iniciar únicamente PostgreSQL**

```bash
docker compose up -d --wait db
```

**4. Aplicar las migraciones**

```bash
pnpm db:deploy
```

**5. Cargar el catálogo**

```bash
pnpm catalog:sync
```

**6. Iniciar las dos aplicaciones**

```bash
pnpm dev
```

Este comando inicia el backend y el frontend en paralelo. Puedes abrir la web en [http://localhost:5173](http://localhost:5173) y consultar la API en [http://localhost:3000/api](http://localhost:3000/api). Detén los procesos con `Ctrl + C`.

El cliente Prisma se genera automáticamente mediante los scripts existentes del backend. **No necesitas ejecutar `pnpm build` para desarrollar.**

Si anteriormente ejecutaste la opción 1, detén sus contenedores con `docker compose down` antes de iniciar esta opción; así evitas conflictos de puertos sin borrar los datos.

### Direcciones disponibles

| Recurso          | URL predeterminada                  |
| ---------------- | ----------------------------------- |
| Aplicación web   | http://localhost:5173               |
| API REST         | http://localhost:3000/api           |
| Swagger UI       | http://localhost:3000/api/docs      |
| OpenAPI JSON     | http://localhost:3000/api/docs-json |
| Estado de la API | http://localhost:3000/api/health    |

**Puertos y entorno:** `PORT`, `WEB_PORT` y `POSTGRES_PORT` permiten cambiar los puertos publicados por Docker. Si cambias la dirección de la web, ajusta `CORS_ORIGINS`. Si cambias la dirección de la API, actualiza `VITE_API_BASE_URL` en el entorno correspondiente.

En Docker, `VITE_API_BASE_URL` se pasa **durante la compilación** del frontend; cambiarla requiere reconstruir la imagen web. Debe ser una dirección accesible desde el navegador, no `http://api:3000`, que solo se resuelve dentro de la red de Docker.

## Funcionalidades

- Exploración de mapas y consulta de detalles, agentes y armas.
- Registro e inicio de sesión con JWT.
- Un voto por usuario y mapa, con selección de agente y arma que se puede actualizar.
- Rankings públicos por mapa, con cantidad de votos y porcentajes.
- Actualización de resultados después de guardar un voto, sin recargar la página.

## Consultar la API

La API se documenta en [Swagger UI](http://localhost:3000/api/docs). También puedes importar [OpenAPI JSON](http://localhost:3000/api/docs-json) en Postman. Para los ejemplos, utiliza `http://localhost:3000/api` como `baseUrl`.

| Método | Ruta                       | Acceso  |
| ------ | -------------------------- | ------- |
| GET    | `/api/health`              | Público |
| POST   | `/api/auth/register`       | Público |
| POST   | `/api/auth/login`          | Público |
| GET    | `/api/auth/me`             | JWT     |
| GET    | `/api/maps`                | Público |
| GET    | `/api/maps/:mapId`         | Público |
| GET    | `/api/agents`              | Público |
| GET    | `/api/agents/:agentId`     | Público |
| GET    | `/api/weapons`             | Público |
| GET    | `/api/weapons/:weaponId`   | Público |
| GET    | `/api/maps/:mapId/vote`    | JWT     |
| PUT    | `/api/maps/:mapId/vote`    | JWT     |
| GET    | `/api/maps/:mapId/results` | Público |

### Probar registro, sesión y votación

**Registro — `POST /api/auth/register`**

```json
{
  "username": "player_one",
  "email": "player@example.com",
  "password": "an example long passphrase"
}
```

Devuelve HTTP 201 y un `accessToken`. Si ya registraste esa cuenta, utiliza otro usuario y correo.

**Inicio de sesión — `POST /api/auth/login`**

```json
{
  "identifier": "player_one",
  "password": "an example long passphrase"
}
```

`identifier` puede ser el username o el email. Usa el `accessToken` recibido como **Bearer Token** en Postman o mediante **Authorize** en Swagger para consultar `GET /api/auth/me` y votar.

**Consultar el catálogo**

```bash
curl http://localhost:3000/api/maps
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/weapons
```

Copia los identificadores de un mapa, agente y arma activos para enviar el voto.

**Votar — `PUT /api/maps/:mapId/vote`**, con Bearer Token:

```json
{
  "agentId": "UUID_DEL_AGENTE",
  "weaponId": "UUID_DEL_ARMA"
}
```

Repetir el PUT permite modificar la elección del mismo mapa. No envíes `userId`: se obtiene del JWT. `GET /api/maps/:mapId/vote` devuelve el voto propio o `null` si todavía no existe.

**Resultados — `GET /api/maps/:mapId/results`**

Es público. Devuelve `mapId`, `totalVotes` y los rankings `agents` y `weapons`, con número de votos y porcentaje. Un mapa sin votos devuelve un total de cero y listas vacías.

## Pruebas y validaciones

Los comandos de esta sección requieren **Node.js, pnpm y `pnpm install --frozen-lockfile`**, incluso si ejecutaste la aplicación mediante la opción Docker. Las pruebas no se ejecutan automáticamente al iniciar el proyecto.

**Pruebas unitarias y aisladas del backend:**

```bash
pnpm test
```

**Pruebas E2E:** utilizan una base PostgreSQL de pruebas independiente, disponible en el puerto `5433`.

```bash
docker compose --profile test up -d --wait db-test
DATABASE_URL=postgresql://valorant_test:test_only@localhost:5433/valorant_test pnpm db:deploy
TEST_DATABASE_URL=postgresql://valorant_test:test_only@localhost:5433/valorant_test pnpm test:e2e
docker compose --profile test stop db-test
```

La base de pruebas utiliza almacenamiento temporal. Después de reiniciar su contenedor, vuelve a aplicar las migraciones antes de ejecutar las E2E. Estas pruebas no deben utilizar la base de desarrollo ni depender de llamadas reales a Valorant API.

**Comprobaciones de calidad:**

```bash
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm build
```

| Comando                         | Propósito                                 |
| ------------------------------- | ----------------------------------------- |
| `pnpm dev`                      | Ejecutar web y API desde el código fuente |
| `pnpm dev:web` / `pnpm dev:api` | Ejecutar solamente una aplicación         |
| `pnpm lint` / `pnpm format`     | Comprobar o corregir código con Biome     |
| `pnpm typecheck` / `pnpm build` | Revisar tipos o compilar ambos workspaces |
| `pnpm test` / `pnpm test:e2e`   | Ejecutar las pruebas del backend          |

Actualmente no hay una suite automatizada del frontend. Las verificaciones del backend incluyen autenticación, votaciones, resultados, concurrencia y contratos HTTP.

## Solución de problemas

| Problema                            | Qué comprobar                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `vite: command not found`           | Ejecuta `pnpm install --frozen-lockfile` desde la raíz.                                                    |
| El puerto `5173` está ocupado       | Detén Vite u otro contenedor que use ese puerto; no ejecutes ambas opciones a la vez.                      |
| El puerto `3000` está ocupado       | Detén el otro proceso/API o ajusta la configuración de puertos.                                            |
| El puerto `5432` está ocupado       | Cambia `POSTGRES_PORT` y, al utilizar pnpm, el puerto en `DATABASE_URL`.                                   |
| La API no arranca en Docker         | Revisa `docker compose ps -a` y `docker compose logs api migrate`.                                         |
| Error de `JWT_SECRET`               | Genera una clave con `openssl rand -hex 32`, actualiza `.env` y reinicia el proceso correspondiente.       |
| Error Prisma `P1000`                | Comprueba `DATABASE_URL` y las credenciales; un volumen existente puede conservar credenciales anteriores. |
| Mapas, agentes o armas vacíos       | Ejecuta la sincronización del catálogo según la opción de ejecución elegida.                               |
| Error HTTP 401                      | Inicia sesión de nuevo o comprueba el Bearer Token.                                                        |
| Error HTTP 503                      | Verifica el estado de PostgreSQL y los logs de la API.                                                     |
| Fallan las pruebas E2E por conexión | Comprueba `db-test`, el puerto `5433`, las migraciones y `TEST_DATABASE_URL`.                              |

Si una sincronización detecta identificadores ausentes y se interrumpe, revisa primero la respuesta del proveedor. Solo para retiradas verificadas utiliza el argumento `--retire-id=UUID` documentado por el comando; nunca lo uses para ignorar errores de disponibilidad del catálogo.

## Estructura del repositorio

```text
apps/
├── api/
│   ├── prisma/          # Esquema y migraciones
│   ├── src/             # Módulos y lógica de NestJS
│   ├── test/            # Pruebas automatizadas
│   └── Dockerfile
└── web/
    ├── src/             # Interfaz React
    ├── components.json  # Configuración shadcn/ui
    └── Dockerfile

compose.yaml
pnpm-workspace.yaml
pnpm-lock.yaml
biome.json
README.md
DOC.md
```

Para conocer la arquitectura, el flujo funcional, el modelo de datos, las decisiones técnicas y el uso de IA, consulta [DOC.md](DOC.md).
