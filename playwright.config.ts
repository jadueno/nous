import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = 3099;
const FRONTEND_PORT = 5199;

// Suite E2E de camino feliz contra un backend + Postgres/pgvector de test reales
// (nunca contra los datos reales — ver global-setup.ts), con FakeProvider (sin claves
// de API, ver backend/src/index.ts). Complementa, no sustituye, a los tests
// unitarios/de componentes de src/ y a los de application/ del backend.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "backend",
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(BACKEND_PORT),
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
        // Forzar FakeProvider siempre en E2E, pase lo que pase en backend/.env local
        // (dotenv no pisa variables ya presentes en process.env, así que esto gana):
        // sin esto, tener Ollama configurado en local hace el E2E lento y no
        // determinista, y en CI no hay Ollama instalado en absoluto.
        ANTHROPIC_API_KEY: "",
        VOYAGE_API_KEY: "",
        OLLAMA_BASE_URL: "",
      },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT}`,
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: `http://localhost:${BACKEND_PORT}` },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
