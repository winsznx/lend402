import postgres, { Sql } from "postgres";

export type PgRow = Record<string, unknown>;

let _sql: Sql | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function shouldUseSsl(databaseUrl: string): boolean {
  return !/(localhost|127\.0\.0\.1)/i.test(databaseUrl);
}

export function getDb(): Sql {
  if (_sql) return _sql;

  const databaseUrl = requiredEnv("DATABASE_URL");

  _sql = postgres(databaseUrl, {
    ssl: shouldUseSsl(databaseUrl) ? "require" : false,
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return _sql;
}
