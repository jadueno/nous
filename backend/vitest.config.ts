import { defineConfig } from "vitest/config";

// Config propia para que vitest no suba a buscar (y herede por error) el
// vite.config.ts del frontend cuando se corre desde backend/.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Varios ficheros de test comparten la misma Postgres de test real, con un
    // truncate global entre tests (ver testPool.ts). Vitest corre ficheros en
    // paralelo por defecto: sin esto, un fichero puede vaciar las tablas mientras
    // otro las está usando — condición de carrera real, reproducida al construir esto.
    fileParallelism: false,
  },
});
