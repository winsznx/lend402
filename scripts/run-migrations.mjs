import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath, URL } from "url";

const require = createRequire(import.meta.url);
const postgres = require("postgres");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Set DATABASE_URL before running.");
  process.exit(1);
}

const MIGRATIONS = [
  new URL("../database/migrations/001_api_vault.sql", import.meta.url),
  new URL("../database/migrations/002_api_vault_prd_alignment.sql", import.meta.url),
];

const sql = postgres(DATABASE_URL, {
  ssl: /(localhost|127\.0\.0\.1)/i.test(DATABASE_URL) ? false : "require",
  max: 1,
});

for (const migrationUrl of MIGRATIONS) {
  const path = fileURLToPath(migrationUrl);
  const filename = path.split("/").pop();
  console.log(`Running ${filename}...`);
  const body = readFileSync(path, "utf8");
  await sql.unsafe(body);
  console.log(`  ✓ done`);
}

await sql.end();
console.log("All migrations applied.");
