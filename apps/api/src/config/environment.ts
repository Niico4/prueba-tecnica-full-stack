export interface Environment {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  PORT: number;
  VALORANT_API_BASE_URL: string;
  VALORANT_API_TIMEOUT_MS: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  CORS_ORIGINS: string[];
}
export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const nodeEnv = values.NODE_ENV ?? "development";
  if (
    nodeEnv !== "development" &&
    nodeEnv !== "test" &&
    nodeEnv !== "production"
  )
    throw new Error("NODE_ENV is invalid");
  const port = Number(values.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be an integer between 1 and 65535");
  const databaseUrl = values.DATABASE_URL;
  if (typeof databaseUrl !== "string")
    throw new Error("DATABASE_URL is required");
  try {
    const url = new URL(databaseUrl);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
  } catch {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL with a database name",
    );
  }
  const origins = String(values.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
        throw new Error();
    } catch {
      throw new Error("CORS_ORIGINS must contain comma-separated HTTP origins");
    }
  }
  const secret = values.JWT_SECRET;
  if (
    typeof secret !== "string" ||
    Buffer.byteLength(secret, "utf8") < 32 ||
    secret.trim() !== secret
  ) {
    throw new Error(
      "JWT_SECRET must contain at least 32 bytes without surrounding whitespace",
    );
  }
  const expiresIn = Number(values.JWT_EXPIRES_IN_SECONDS ?? 3600);
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 86400) {
    throw new Error(
      "JWT_EXPIRES_IN_SECONDS must be an integer between 60 and 86400",
    );
  }
  const baseUrl = String(
    values.VALORANT_API_BASE_URL ?? "https://valorant-api.com/v1",
  ).replace(/\/+$/, "");
  try {
    const url = new URL(baseUrl);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
  } catch {
    throw new Error(
      "VALORANT_API_BASE_URL must be an HTTP(S) URL without credentials, query or fragment",
    );
  }
  const timeout = Number(values.VALORANT_API_TIMEOUT_MS ?? 10000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30000)
    throw new Error(
      "VALORANT_API_TIMEOUT_MS must be an integer between 100 and 30000",
    );
  return {
    VALORANT_API_BASE_URL: baseUrl,
    VALORANT_API_TIMEOUT_MS: timeout,
    JWT_SECRET: secret,
    JWT_EXPIRES_IN_SECONDS: expiresIn,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    PORT: port,
    CORS_ORIGINS: origins,
  };
}
