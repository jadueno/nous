import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

/**
 * Prepara la base de datos de test antes de la suite E2E: migra y la deja vacía.
 * Nunca debe poder apuntar, ni por error, a la base de datos real.
 */
export default async function globalSetup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("Falta TEST_DATABASE_URL. Los tests E2E nunca deben apuntar a la base de datos real.");
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL no puede coincidir con DATABASE_URL: los E2E truncarían tus notas reales.");
  }

  execSync("npm run test:migrate", {
    cwd: path.resolve(process.cwd(), "backend"),
    stdio: "inherit",
    env: process.env,
  });

  const client = new Client({ connectionString: testUrl });
  await client.connect();
  await client.query("truncate table chunks, notes, messages restart identity cascade");
  await client.end();
}
