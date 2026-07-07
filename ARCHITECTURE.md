# Arquitectura y decisiones técnicas

Este documento explica cómo está construida la aplicación y por qué, pensado para quien quiera revisarla como muestra de trabajo (arquitectura, decisiones, testing) más que como manual de uso — para eso está el [README](README.md).

## Visión general

Nous es un asistente personal de notas: escribes notas, y puedes preguntarles en lenguaje natural — la respuesta la genera un modelo real (RAG con IA local por defecto), anclada a lo que hay en tus notas, no un chat genérico inventándoselo.

```
Frontend (React + TS)  ──HTTP/JSON──▶  Backend (Fastify + TS)  ──SQL──▶  PostgreSQL + pgvector
     dominio puro                        hexagonal                      (Docker)
```

## Stack y por qué

| Capa | Elección | Motivo |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Rápido de iterar, tipado de extremo a extremo |
| Backend | Node + TypeScript + Fastify | Overhead mínimo, tipado compartido con el frontend a nivel de contrato |
| Base de datos | PostgreSQL + `pgvector` en Docker (local) | Búsqueda por similitud sin un servicio de BD vectorial aparte — despliegue tan ligero como un Postgres normal |
| Embeddings/LLM | Ollama local (`mxbai-embed-large` 1024 dim + `qwen2.5:7b-instruct`) por defecto; Voyage AI + Claude opcionales | Uso personal sobre notas privadas: sin coste por pregunta y sin que el contenido salga del Mac. Voyage/Claude quedan como adaptador alternativo de mejor calidad si algún día se quiere pagar por ello |
| Sin ORM | Repositorios con `pg` + SQL explícito | Mismo criterio que en proyectos anteriores: el volumen de queries es pequeño y controlado |

## Arquitectura hexagonal (backend)

```
backend/src/
  domain/           tipos + puertos (EmbeddingProvider, LLMProvider, repositorios) + chunkText() — cero dependencias externas
  application/       casos de uso: notes (CRUD + vectorizar), chat (RAG con memoria: persiste la conversación y genera la respuesta)
  infrastructure/
    db/             pool de conexión, migraciones, repositorios Postgres/pgvector
    llm/            adaptadores: FakeProvider (tests), OllamaProvider (local, por defecto), VoyageEmbeddingProvider + AnthropicLLMProvider (opcionales, de pago)
    http/           servidor Fastify, rutas HTTP
```

**El proveedor de IA es un puerto, no un detalle de infraestructura fijo.** `EmbeddingProvider` y `LLMProvider` son dos puertos independientes (Anthropic no ofrece embeddings, así que la pareja de pago sería Voyage AI + Claude) — el dominio y los casos de uso no saben ni les importa si detrás hay un modelo local (Ollama), una API de pago o el `FakeProvider` determinista que usan los tests. Orden de prioridad en `index.ts`: claves de pago (`ANTHROPIC_API_KEY`/`VOYAGE_API_KEY`) > Ollama local (`OLLAMA_BASE_URL`) > `FakeProvider` (nada configurado).

**Por qué Ollama y no una API de pago, para este proyecto en concreto**: RAG sobre notas *privadas* de una sola persona no tiene la misma justificación de coste que en una empresa (donde el gasto en IA se compensa con ahorro/ingreso) — pagar por token para buscar en las propias notas no compensaba. Un modelo local en el Mac mini (M4, 16GB) da respuestas reales y con comprensión semántica de verdad, sin factura ni clave de API, y refuerza la propuesta de valor central del proyecto (dueño de tus datos: ni siquiera el proveedor de IA los ve).

**Por qué el chat ya no enseña citas ni existe una pantalla de "Buscar" separada**: la primera versión sí mostraba, debajo de la respuesta, las notas de origen y un buscador semántico directo — pensado como la "prueba" de que la respuesta estaba anclada a algo real. En uso real, con un modelo generando de verdad (Ollama), ese andamiaje sobraba: rompía la sensación de conversación natural sin aportar nada que el usuario fuera a usar. El backend sigue calculando y filtrando por relevancia el contexto recuperado antes de pasarlo al LLM (`MIN_RELEVANCE_SCORE` en `application/chat.ts`) — el anclaje a las notas reales sigue existiendo, solo que ya no se enseña en la interfaz.

**Memoria conversacional**: el chat persiste cada pregunta/respuesta en una tabla `messages` (Postgres, igual que las notas) como una única conversación continua — sin hilos separados, encaja con el uso personal tipo asistente único, y sobrevive a recargar la página o cambiar de dispositivo. Al preguntar, se pasan al LLM los últimos turnos (`HISTORY_LIMIT` en `application/chat.ts`) como mensajes con rol, no como texto plano concatenado — Ollama (`/api/chat`) y Anthropic soportan mensajes con rol de forma nativa, así que el historial entra como turnos reales de conversación en vez de aplanarse a mano dentro de un único prompt. Esto es lo que permite preguntas de seguimiento del tipo "¿y a Juan?" tras preguntar por los gustos de Flor, sin repetir el contexto explícitamente.

**Streaming de la respuesta**: `POST /messages` no devuelve un único JSON al terminar, sino un stream de eventos (SSE: `event: token` por cada trozo, `event: done` al final con el mensaje persistido y las citas) — el texto se ve aparecer según lo genera el modelo, en vez de esperar con un indicador de carga hasta tener la respuesta entera. `LLMProvider.answer` recibe un `onToken` que cada adaptador invoca a medida que le llegan trozos reales: Ollama con `stream: true` sobre `/api/chat` (NDJSON, una línea por trozo) y Anthropic con su streaming SSE nativo (`content_block_delta`); el `FakeLLMProvider` de los tests trocea su respuesta palabra a palabra para poder probar el streaming de punta a punta sin red. No se usa `EventSource` (solo soporta GET): la petición lleva la pregunta en el body de un POST, así que tanto el backend como el frontend leen/escriben los frames SSE a mano sobre el `body` de la petición/respuesta.

**PWA sin service worker**: `manifest.webmanifest` + iconos (192/512 PNG + variante maskable) + `apple-touch-icon`/meta `apple-mobile-web-app-*` bastan para "añadir a pantalla de inicio" en Android/iOS y abrir como app (sin la barra de Safari/Chrome). Sin service worker ni soporte offline a propósito: la app necesita el backend en vivo de todas formas (notas y chat viven en Postgres), así que la complejidad de cachear assets no compensa cuando de todos modos no funciona sin conexión al backend.

## Decisiones de testing

- **Tests de dominio** (`chunkText`, casos de uso): con fakes en memoria, sin BD ni red.
- **Tests de integración** (repositorios, servidor HTTP): contra una Postgres de test real (con `pgvector`), nunca la base real — mismo guard que otros proyectos (`TEST_DATABASE_URL` no puede coincidir con `DATABASE_URL`, falla fuerte si no).
- **Bug real encontrado y arreglado durante el desarrollo**: vitest ejecuta ficheros de test en paralelo por defecto; como varios ficheros comparten la misma Postgres de test con un `truncate` global entre tests, un fichero podía vaciar las tablas mientras otro las estaba usando — condición de carrera reproducida y arreglada con `fileParallelism: false` en `backend/vitest.config.ts`.
- **Los tests nunca llaman a un proveedor de IA real** (ni de pago ni Ollama): usan siempre `FakeEmbeddingProvider`/`FakeLLMProvider` (un "hashing trick" de bolsa de palabras normalizado con stopwords del español y sin acentos, determinista pero con similitud coseno real basada en solapamiento de palabras — suficiente para verificar ranking sin depender de un proveedor real). `playwright.config.ts` fuerza explícitamente `ANTHROPIC_API_KEY`/`VOYAGE_API_KEY`/`OLLAMA_BASE_URL` a vacío en el `webServer` del backend: `dotenv` no pisa variables ya presentes en `process.env`, así que sin este override el E2E local heredaría la config de `backend/.env` del desarrollador (Ollama, si está activado) y dejaría de ser rápido/determinista.
