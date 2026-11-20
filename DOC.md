# Documentación técnica

## 1. Arquitectura

Monorepo pnpm con backend NestJS modular y PostgreSQL mediante Prisma. **Implementado:** infraestructura, autenticación y catálogo. **Pendiente:** votaciones, resultados y frontend React/Vite. La guía de uso está en [README.md](README.md).

```mermaid
flowchart TB
    Cliente["Cliente HTTP"] --> API["NestJS REST API"]
    API --> Auth["Auth / Users"]
    API --> Catalogo["Maps / Agents / Weapons"]
    Auth --> Prisma["Prisma"]
    Catalogo --> Prisma
    Prisma --> DB[("PostgreSQL")]
    Proveedor["Valorant API"] --> Sync["Sincronización manual<br/>validación y mapeo"]
    Sync --> Prisma
```

| Módulo            | Responsabilidad                                                 |
| ----------------- | --------------------------------------------------------------- |
| Health            | Disponibilidad de API y PostgreSQL.                             |
| Auth / Users      | Registro, JWT y acceso a cuentas; sin CRUD público de usuarios. |
| Maps              | Mapas y detalles.                                               |
| Agents            | Agentes, roles de juego y habilidades.                          |
| Weapons           | Armas y rangos de daño.                                         |
| Valorant          | Validar y sincronizar el catálogo; separado del servidor HTTP.  |
| Votes — pendiente | Votos por mapa y resultados agregados.                          |

## 2. Flujo de la aplicación

Flujo previsto del producto: la exploración y autenticación ya funcionan por API; la interfaz web y los pasos marcados como pendientes aún no existen.

```mermaid
flowchart TD
    Inicio["Explorar mapas, agentes y armas<br/>Acceso público"] --> Mapa["Consultar un mapa"]
    Mapa --> Sesion{"¿Tiene un JWT válido?"}
    Sesion -- No --> Auth["Registrarse o iniciar sesión"]
    Auth --> Token["Obtener JWT"]
    Sesion -- Sí --> Elegir
    Token --> Elegir
    Elegir["Elegir agente y arma<br/>Pendiente"] --> Votar["Crear o actualizar voto del mapa<br/>Pendiente"]
    Votar --> Resultados["Consultar resultados de la comunidad<br/>Público · Pendiente"]
    Mapa --> Resultados
    Resultados --> Mapa
    classDef pendiente fill:#fff3cd,stroke:#9a6700,stroke-dasharray:5 5,color:#333;
    class Elegir,Votar,Resultados pendiente;
```

## 3. Modelo de datos

ERD contrastado con [schema.prisma](apps/api/prisma/schema.prisma). Usa nombres de modelos/propiedades Prisma; PostgreSQL utiliza tablas y columnas snake_case mediante mappings. Las [migraciones](apps/api/prisma/migrations) añaden CHECK y NOT NULL que Prisma no expresa completamente. La tabla de votos existe, pero su funcionalidad HTTP está pendiente.

```mermaid
erDiagram
    USERS ||..o{ VOTES : casts
    MAPS ||..o{ VOTES : receives
    AGENTS ||..o{ VOTES : receives
    WEAPONS ||..o{ VOTES : receives

    AGENT_ROLES ||..o{ AGENTS : categorizes
    AGENTS ||--o{ AGENT_ABILITIES : has
    WEAPONS ||--o{ WEAPON_DAMAGE_RANGES : has

    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        timestamptz created_at
        timestamptz updated_at
    }

    MAPS {
        uuid id PK
        varchar display_name
        text tactical_description "Nullable"
        text display_icon "Nullable"
        text splash "Nullable"
        boolean is_active
    }

    AGENT_ROLES {
        uuid id PK
        varchar display_name
        text description
        text display_icon "Nullable"
    }

    AGENTS {
        uuid id PK
        uuid role_id FK
        varchar display_name
        text description
        text display_icon "Nullable"
        text full_portrait "Nullable"
        text background "Nullable"
        text[] background_gradient_colors
        boolean is_active
    }

    AGENT_ABILITIES {
        uuid agent_id PK, FK
        varchar slot PK
        varchar display_name
        text description
        text display_icon "Nullable"
    }

    WEAPONS {
        uuid id PK
        varchar display_name
        text display_icon "Nullable"
        varchar category
        int cost "Nullable"
        boolean is_active
    }

    WEAPON_DAMAGE_RANGES {
        uuid weapon_id PK, FK
        int range_start_meters PK
        int range_end_meters PK
        float head_damage
        float body_damage
        float leg_damage
    }

    VOTES {
        uuid id PK
        uuid user_id FK
        uuid map_id FK
        uuid agent_id FK
        uuid weapon_id FK
        timestamptz created_at
        timestamptz updated_at
    }
```

| Restricción importante                 | Garantía                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email y username normalizados y únicos | Evita cuentas duplicadas, incluso con registros concurrentes.                                                                                                        |
| `UNIQUE(userId, mapId)` en vote        | Un voto por usuario/mapa; permite votar en mapas distintos. La edición atómica del voto sigue pendiente.                                                             |
| PK compuestas de habilidad y daño      | Slot identifica la habilidad dentro del agente; inicio/fin identifica el rango dentro del arma, sin UUID inventados.                                                 |
| Borrado restringido                    | Usuarios/mapas/agentes/armas con votos y roles con agentes no pueden eliminarse; evita alterar el historial. Habilidades y rangos usan cascada desde su propietario. |
| CHECK de costo y daño                  | Costo nulo o no negativo; distancias enteras no negativas, fin mayor que inicio, daños finitos no negativos.                                                         |

IDs y FKs usan UUID nativo: User/Vote los generan localmente; el catálogo conserva los del proveedor. Fechas usan timestamptz; `createdAt` tiene default `now()` y `updatedAt` lo mantiene Prisma. `isActive` inicia en true; colores en array vacío obligatorio. Los roles son categorías de agentes, **no permisos de usuarios**.

## 4. Decisiones técnicas

| Decisión                            | Motivo o compromiso                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Módulos por dominio                 | Mantener responsabilidades claras en un monolito; sin repositorios genéricos, microservicios ni módulos separados para habilidades/rangos.                                                                                                                                                                             |
| Catálogo persistido                 | Lecturas independientes del proveedor. Listas solo de activos; detalles incluyen retirados para resolver referencias históricas.                                                                                                                                                                                       |
| Contratos externos separados        | Zod valida JSON antes del mapeo; DTOs públicos y Prisma tienen responsabilidades distintas. Se persisten solo campos seleccionados.                                                                                                                                                                                    |
| Elegibilidad explícita              | Mapas estándar por UUID contrastados con Riot, no por rotación competitiva.                                                                                                                                                                                                                                            |
| Sincronización manual e idempotente | Upserts y reemplazo de dependientes en una transacción para los tres catálogos. Bloqueo PostgreSQL antes de descargar evita ejecuciones superpuestas; ocupa una conexión durante la descarga acotada. Sin scheduler.                                                                                                   |
| Retiradas revisadas                 | Un HTTP 200 no prueba completitud. Ausencias respecto de la línea base o registros activos abortan todo; solo la lista exacta de UUID revisados permite desactivarlos. No se eliminan entidades ni votos. Las colecciones dependientes se consideran completas al validar el contrato, sin garantía externa adicional. |
| JWT y bcrypt                        | Token HS256 con issuer/audience y expiración; sin sesiones ni refresh tokens. Contraseña de 12+ caracteres y hasta 72 bytes UTF-8, sin recortar, NUL ni solo espacios; costo bcrypt 12. Todos los usuarios tienen las mismas capacidades.                                                                              |
| Consistencia de votos — pendiente   | Identidad desde JWT, nunca desde el body; mapa/agente/arma existentes y activos. Crear o editar atómicamente bajo la unicidad compuesta, incluso con concurrencia.                                                                                                                                                     |
| Resultados calculados — pendiente   | Sin tabla agregada: agente y arma usan por separado el total de votos del mapa. Sin votos: total cero y listas vacías. Orden descendente por votos con desempate estable.                                                                                                                                              |
| Pruebas proporcionadas              | Vitest/Supertest, PostgreSQL aislado y fixtures externos. Priorizar reglas y regresiones; sin cobertura porcentual exigida. Mantener concurrencia, rollback y privacidad; evitar duplicar el mismo caso entre capas.                                                                                                   |

## 5. Uso de IA

Se utilizó **Codex, basado en GPT-6**, con terminal, documentación oficial y consultas HTTP. Participó en análisis, implementación, pruebas y documentación; no se delegó a subagentes.

| Responsabilidad    | Participación                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Decisiones humanas | El usuario definió stack, ocho entidades, reglas de negocio, alcance por fases y autorizó cada continuación. También solicitó reducir redundancia en tests y documentación.                                                          |
| Propuestas de IA   | Configuración compatible con NestJS, parámetros JWT/bcrypt, validación de GUID, bloqueo de sincronización y revisión explícita de retiradas.                                                                                         |
| Validación         | Revisión manual del código y las consultas SQL, verificación de endpoints mediante Postman y Swagger, ejecución de typecheck, lint, compilación, pruebas unitarias y E2E, y comprobación de la sincronización real con Valorant API. |
