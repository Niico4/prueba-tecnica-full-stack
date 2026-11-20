# Valorant Community

Aplicación web donde los jugadores de VALORANT pueden elegir sus agentes y armas favoritos para cada mapa y consultar las preferencias de la comunidad.

Desarrollada como parte de una [prueba técnica Full Stack](https://david-lucidbot.github.io/technical-test/).

## Estado del proyecto

- [x] Infraestructura, base de datos y entorno Docker.
- [x] Registro de usuarios y autenticación JWT.
- [x] Integración con Valorant API y catálogo de mapas, agentes y armas.
- [x] Sistema de votaciones por mapa.
- [x] Resultados de la comunidad.
- [ ] Frontend e integración final.

## Tecnologías

| Área                 | Tecnologías                               |
| -------------------- | ----------------------------------------- |
| Backend              | NestJS, TypeScript                        |
| Base de datos        | PostgreSQL, Prisma ORM                    |
| Autenticación        | JWT, bcrypt                               |
| Integración externa  | [Valorant API](https://valorant-api.com/) |
| Documentación API    | Swagger / OpenAPI                         |
| Pruebas              | Vitest, Supertest                         |
| Herramientas         | pnpm Workspaces, Biome, Docker Compose    |
| Frontend (pendiente) | React, Vite, TypeScript                   |

## Ejecutar el proyecto con Docker

### Requisitos

- Docker Engine o Docker Desktop con Docker Compose v2 y Docker en ejecución.
- Puertos 3000 (API) y 5432 (PostgreSQL) disponibles.
- Conexión a Internet para construir las imágenes y cargar el catálogo inicial.

Todos los comandos siguientes se ejecutan desde la raíz del repositorio clonado.

### 1. Configurar las variables de entorno

```bash
cp .env.example .env
```

Genera un secreto para la autenticación JWT:

```bash
openssl rand -hex 32
```

Abre `.env` y asigna el valor generado a `JWT_SECRET`. La aplicación requiere un secreto de al menos 32 bytes, sin espacios al principio ni al final.

Si no tienes OpenSSL, utiliza un generador criptográficamente seguro equivalente. Los demás valores de ejemplo son para uso local.

### 2. Iniciar los servicios

```bash
docker compose up -d --build --wait
```

Docker Compose inicia PostgreSQL, aplica las migraciones versionadas mediante el servicio `migrate` y levanta la API.

No necesitas ejecutar las migraciones manualmente con esta opción.

### 3. Cargar el catálogo de VALORANT

```bash
docker compose exec -T api pnpm catalog:sync
```

Este comando importa mapas, agentes, roles, habilidades, armas y rangos de daño desde Valorant API a PostgreSQL.

Puedes repetirlo para actualizar el catálogo sin duplicar registros.

Si se detectan UUID ausentes, la sincronización aborta sin cambiar datos. Solo después de confirmar que son retiradas reales, repite el comando añadiendo `--retire-id=UUID` por cada ausente. La lista debe ser exacta; si el UUID permanece en la línea base revisada, el argumento seguirá siendo necesario en futuras ejecuciones. No lo uses para eludir un fallo del proveedor.

> La sincronización es manual. Si omites este paso en una instalación nueva, los endpoints del catálogo devolverán listas vacías.

### 4. Comprobar que la API está disponible

```bash
curl --fail http://localhost:3000/api/health
```

Respuesta esperada (HTTP 200):

```json
{
  "status": "ok",
  "database": "up"
}
```

| Recurso         | URL                                 |
| --------------- | ----------------------------------- |
| API REST (base) | http://localhost:3000/api           |
| Swagger UI      | http://localhost:3000/api/docs      |
| OpenAPI JSON    | http://localhost:3000/api/docs-json |
| Health check    | http://localhost:3000/api/health    |

Las URLs utilizan el puerto predeterminado. Si modificas `PORT` en `.env`, actualiza las direcciones correspondientes.

### Administrar los servicios

```bash
# Consultar contenedores
docker compose ps -a

# Consultar logs
docker compose logs -f api

# Detener y eliminar contenedores
docker compose down
```

`docker compose down` conserva los datos de PostgreSQL mediante el volumen persistente.

**Importante:** `docker compose down -v` también elimina los volúmenes del proyecto y sus datos. Utilízalo únicamente cuando quieras reiniciar la base.

## Probar la API

Puedes utilizar [Swagger UI](http://localhost:3000/api/docs) desde el navegador o importar el [documento OpenAPI](http://localhost:3000/api/docs-json) en Postman mediante **Import**.

El documento OpenAPI se genera a partir de la API en ejecución.

En Postman, crea una variable `baseUrl` con el siguiente valor:

```text
http://localhost:3000/api
```

### Endpoints disponibles

| Método | Ruta                       | Acceso     |
| ------ | -------------------------- | ---------- |
| GET    | `/api/health`              | Público    |
| POST   | `/api/auth/register`       | Público    |
| POST   | `/api/auth/login`          | Público    |
| GET    | `/api/auth/me`             | Bearer JWT |
| GET    | `/api/maps`                | Público    |
| GET    | `/api/maps/:mapId`         | Público    |
| GET    | `/api/agents`              | Público    |
| GET    | `/api/agents/:agentId`     | Público    |
| GET    | `/api/weapons`             | Público    |
| GET    | `/api/weapons/:weaponId`   | Público    |
| PUT    | `/api/maps/:mapId/vote`    | Bearer JWT |
| GET    | `/api/maps/:mapId/vote`    | Bearer JWT |
| GET    | `/api/maps/:mapId/results` | Público    |

### 1. Registrar un usuario

**POST** `{{baseUrl}}/auth/register`

Selecciona **Body → raw → JSON** en Postman y envía:

```json
{
  "username": "player_one",
  "email": "player@example.com",
  "password": "an example long passphrase"
}
```

La API devuelve HTTP 201 con los datos públicos del usuario y un `accessToken`.

Utiliza un email y username diferentes si ya registraste esta cuenta.

### 2. Iniciar sesión

**POST** `{{baseUrl}}/auth/login`

```json
{
  "identifier": "player_one",
  "password": "an example long passphrase"
}
```

`identifier` acepta el username o el email.

La respuesta HTTP 200 incluye `accessToken`, `tokenType`, `expiresIn` y `user`.

### 3. Consultar el usuario autenticado

**GET** `{{baseUrl}}/auth/me`

En Postman, selecciona **Authorization → Bearer Token** y pega el `accessToken` recibido.

En Swagger, utiliza la opción **Authorize**.

La API devuelve los datos públicos del usuario autenticado. Por defecto, el token expira después de una hora; vuelve a iniciar sesión cuando expire.

### 4. Consultar el catálogo

Las siguientes peticiones no requieren autenticación:

```bash
curl http://localhost:3000/api/maps
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/weapons
```

Para consultar un elemento específico, copia su identificador desde la respuesta correspondiente y utilízalo en su endpoint de detalle.

Las listas incluyen elementos activos. Los agentes incluyen rol y habilidades; las armas incluyen rangos de daño cuando están disponibles.

Los elementos retirados siguen accesibles por su identificador.

### 5. Registrar o consultar tu voto

**PUT** `{{baseUrl}}/maps/:mapId/vote`, con **Authorization → Bearer Token**. Sustituye los identificadores por los obtenidos del catálogo activo:

```json
{
  "agentId": "<GUID del agente>",
  "weaponId": "<GUID del arma>"
}
```

Devuelve HTTP 200 con `id`, `mapId`, `agentId`, `weaponId`, `createdAt` y `updatedAt`. Repetir el PUT cambia tu voto para ese mapa; si la selección es idéntica, conserva también `updatedAt`. No envíes `userId`: se obtiene del JWT.

**GET** sobre la misma ruta devuelve tu voto o JSON `null` (HTTP 200). Permite consultar elecciones históricas aunque sus elementos estén inactivos. El PUT rechaza identificadores mal formados (400), inexistentes (404) o inactivos (422). Ambas operaciones requieren JWT válido (401) y devuelven 503 si el almacenamiento no está disponible.

### 6. Consultar los resultados de la comunidad

**GET** `{{baseUrl}}/maps/:mapId/results`, sin autenticación. También está disponible en la sección **votes** de Swagger.

Devuelve `mapId`, `totalVotes` y los rankings `agents` y `weapons`. Cada elemento incluye `id`, `displayName`, `displayIcon` (puede ser `null`), `votes` y `percentage`. Solo aparecen elecciones con votos, incluidas las retiradas del catálogo.

Los rankings se ordenan por votos descendentes, con desempate por nombre y UUID. Los porcentajes usan el total del mapa y hasta dos decimales. Un mapa sin votos devuelve total cero y ambas listas vacías; un mapa inexistente devuelve 404.

## Pruebas y validaciones

El backend utiliza **Vitest** como framework de pruebas y **Supertest** para verificar el comportamiento HTTP de la API.

Las pruebas automatizadas permiten comprobar funcionalidades existentes y detectar errores después de realizar cambios.

**No se ejecutan automáticamente al iniciar Docker ni al levantar NestJS.** Debes ejecutarlas mediante los comandos correspondientes, salvo que configures posteriormente un proceso de integración continua.

### 1. Pruebas unitarias y de integración aisladas

Requieren Node.js, pnpm y las dependencias del proyecto instaladas.

Desde la raíz del repositorio:

```bash
pnpm test
```

Estas pruebas verifican comportamientos del backend utilizando mocks o dependencias controladas. No necesitan consultar Valorant API ni utilizar la base de datos real de desarrollo.

### 2. Pruebas E2E

Las pruebas End-to-End verifican el funcionamiento de los endpoints utilizando una instancia real de PostgreSQL, separada de la base de desarrollo.

Primero, inicia la base de datos de pruebas:

```bash
docker compose --profile test up -d --wait db-test
```

Aplica las migraciones sobre esa base:

```bash
DATABASE_URL=postgresql://valorant_test:test_only@localhost:5433/valorant_test pnpm db:deploy
```

Ejecuta las pruebas:

```bash
TEST_DATABASE_URL=postgresql://valorant_test:test_only@localhost:5433/valorant_test pnpm test:e2e
```

Finalmente, detén el contenedor de pruebas:

```bash
docker compose --profile test stop db-test
```

La base de pruebas utiliza almacenamiento temporal y debe migrarse nuevamente después de reiniciar su contenedor.

Las pruebas E2E no deben utilizar la base de datos de desarrollo ni depender de peticiones reales a Valorant API.

### 3. Validaciones de calidad

Para comprobar el esquema de Prisma, el formato, los tipos y la compilación:

```bash
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm build
```

| Comando            | Función                                                  |
| ------------------ | -------------------------------------------------------- |
| `pnpm test`        | Ejecuta las pruebas unitarias y de integración aisladas. |
| `pnpm test:e2e`    | Ejecuta las pruebas E2E con PostgreSQL de pruebas.       |
| `pnpm db:validate` | Valida el esquema de Prisma.                             |
| `pnpm lint`        | Comprueba las reglas de Biome.                           |
| `pnpm typecheck`   | Comprueba los tipos de TypeScript.                       |
| `pnpm build`       | Compila el proyecto.                                     |

Las pruebas de votaciones cubren creación, edición, idempotencia sin escritura, aislamiento por usuario/mapa, autenticación, validación, historial inactivo, concurrencia, restricciones PostgreSQL, errores de almacenamiento y contrato OpenAPI.

Las pruebas de resultados cubren acceso público, mapas sin votos, agregación y porcentajes, aislamiento por mapa, edición de votos, empates, historial inactivo y coherencia durante escrituras concurrentes.

Las pruebas automatizadas complementan las consultas HTTP y SQL registradas en [DOC.md](DOC.md). Swagger y Postman permiten explorar la API, sin que esto implique una revisión manual documentada con esas interfaces.

## Solución de problemas

| Problema                            | Solución                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| La API no arranca                   | Revisa `docker compose ps -a` y `docker compose logs api migrate`.                                                                                  |
| Error JWT_SECRET                    | Genera una clave segura con `openssl rand -hex 32` y actualiza `.env`. Después recrea el contenedor de la API.                                      |
| Error Prisma P1000                  | Comprueba que las credenciales de PostgreSQL y la URL de conexión sean consistentes. Si la base ya existía, sus credenciales pueden ser diferentes. |
| El catálogo está vacío              | Ejecuta `docker compose exec -T api pnpm catalog:sync`.                                                                                             |
| Puerto 3000 ocupado                 | Modifica `PORT` en `.env` y utiliza el nuevo puerto en Swagger y Postman.                                                                           |
| Puerto 5432 ocupado                 | Modifica `POSTGRES_PORT` y el puerto de `DATABASE_URL` para ejecución local. Dentro de Docker se mantiene `db:5432`.                                |
| HTTP 401                            | Comprueba el token Bearer o vuelve a iniciar sesión.                                                                                                |
| HTTP 503 en health                  | Comprueba PostgreSQL y los logs de la API.                                                                                                          |
| Las pruebas E2E fallan por conexión | Comprueba que `db-test` esté ejecutándose, que las migraciones estén aplicadas y que `TEST_DATABASE_URL` apunte a la base de pruebas.               |

Para reconstruir los servicios y aplicar migraciones pendientes:

```bash
docker compose up -d --build --wait
```

Si modificas variables de entorno utilizadas por un contenedor existente, puede ser necesario recrearlo para que cargue los nuevos valores.

## Estructura del proyecto

```text
apps/
├── api/
│   ├── prisma/          # Esquema y migraciones
│   ├── src/
│   │   ├── config/      # Configuración y entorno
│   │   ├── database/    # Integración con Prisma
│   │   ├── common/      # Utilidades compartidas
│   │   └── modules/     # Health, auth, users, catálogo y votes
│   ├── test/            # Pruebas automatizadas
│   └── Dockerfile
└── web/                 # Frontend pendiente
DOC.md                   # Arquitectura, modelo y decisiones
compose.yaml
pnpm-workspace.yaml
pnpm-lock.yaml
```

## Documentación técnica

[DOC.md](DOC.md) reúne arquitectura, flujo previsto, ERD completo, decisiones técnicas y uso de IA, distinguiendo lo implementado de lo pendiente.

Consulta `.env.example` para la configuración de entorno.
