# Arquitectura y decisiones técnicas

Este documento explica cómo está construida la aplicación y por qué, pensado para quien quiera revisarla como muestra de trabajo (arquitectura, decisiones, testing) más que como manual de uso — para eso está el [README](README.md).

## Visión general

Nous es un asistente personal de notas con búsqueda semántica: escribes notas, y puedes preguntarles en lenguaje natural — la respuesta cita siempre la nota de origen (RAG con citas, no un chat genérico "con IA encima").

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
| Embeddings | Voyage AI (`voyage-3`, 1024 dim) | Recomendado por Anthropic como pareja de Claude (que no ofrece embeddings propios) |
| LLM | Claude (Anthropic) | Llamada HTTP directa, sin SDK — una sola llamada no justifica la dependencia extra |
| Sin ORM | Repositorios con `pg` + SQL explícito | Mismo criterio que en proyectos anteriores: el volumen de queries es pequeño y controlado |

## Arquitectura hexagonal (backend)

```
backend/src/
  domain/           tipos + puertos (EmbeddingProvider, LLMProvider, repositorios) + chunkText() — cero dependencias externas
  application/       casos de uso: notes (CRUD + vectorizar), ask (RAG con citas), search (búsqueda semántica directa)
  infrastructure/
    db/             pool de conexión, migraciones, repositorios Postgres/pgvector
    llm/            adaptadores: FakeProvider (tests), VoyageEmbeddingProvider, AnthropicLLMProvider
    http/           servidor Fastify, rutas HTTP
```

**El proveedor de IA es un puerto, no un detalle de infraestructura fijo.** `EmbeddingProvider` y `LLMProvider` son dos puertos independientes (Anthropic no ofrece embeddings, así que la pareja real es Voyage AI + Claude) — el dominio y los casos de uso no saben ni les importa si detrás hay una API de pago, un modelo local (Ollama, roadmap) o el `FakeProvider` determinista que usan los tests. Sin ninguna clave de API configurada, la app arranca igual con `FakeProvider`: se puede clonar y probar sin pagar ni configurar nada.

## Decisiones de testing

- **Tests de dominio** (`chunkText`, casos de uso): con fakes en memoria, sin BD ni red.
- **Tests de integración** (repositorios, servidor HTTP): contra una Postgres de test real (con `pgvector`), nunca la base real — mismo guard que otros proyectos (`TEST_DATABASE_URL` no puede coincidir con `DATABASE_URL`, falla fuerte si no).
- **Bug real encontrado y arreglado durante el desarrollo**: vitest ejecuta ficheros de test en paralelo por defecto; como varios ficheros comparten la misma Postgres de test con un `truncate` global entre tests, un fichero podía vaciar las tablas mientras otro las estaba usando — condición de carrera reproducida y arreglada con `fileParallelism: false` en `backend/vitest.config.ts`.
- **CI nunca llama a una API de pago**: los tests usan siempre `FakeEmbeddingProvider`/`FakeLLMProvider` (un "hashing trick" de bolsa de palabras normalizado, determinista pero con similitud coseno real basada en solapamiento de palabras — suficiente para verificar ranking sin depender de Voyage/Claude).
