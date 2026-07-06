# Nous

[![CI](https://github.com/jadueno/nous/actions/workflows/ci.yml/badge.svg)](https://github.com/jadueno/nous/actions/workflows/ci.yml)

Tu segundo cerebro personal autoalojado: escribe notas y pregúntales en lenguaje natural — las respuestas citan siempre la nota de origen (RAG de verdad, no un buscador con IA encima).

📐 Arquitectura, decisiones técnicas y aprendizajes en **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Por qué

Las alternativas cloud (Notion AI, Mem, Tana) no te dejan ser dueño de tus datos; las autoalojadas open-source (Khoj, Onyx, Quivr) están pensadas para equipos, con arquitecturas pesadas para un uso genuinamente personal. Nous es ligero (Postgres + `pgvector`, sin servicio de BD vectorial aparte), autoalojado, y con el proveedor de IA (embeddings + LLM) intercambiable por diseño — funciona sin ninguna clave de API configurada (respuestas simuladas) y con Claude + Voyage AI en cuanto añades las tuyas.

## Configuración inicial

Necesitas Node.js, npm y Docker instalados.

```bash
# 1. Variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
# Edita ambos .env y pon tu propia contraseña de Postgres (debe
# coincidir en los dos archivos, tanto en POSTGRES_PASSWORD como
# dentro de DATABASE_URL). ANTHROPIC_API_KEY/VOYAGE_API_KEY son
# opcionales: sin ellas la app funciona igual, con respuestas simuladas.

# 2. Base de datos
docker compose up -d
cd backend && npm install && npm run migrate:up && cd ..

# 3. Backend y frontend
cd backend && npm run dev   # otra terminal
npm install && npm run dev  # raíz del proyecto
```

## Tests

```bash
npm test              # frontend
cd backend && npm test # backend (necesita TEST_DATABASE_URL, nunca la BD real)
npm run test:e2e       # E2E con Playwright
```
