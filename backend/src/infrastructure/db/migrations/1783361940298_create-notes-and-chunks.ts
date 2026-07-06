import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

// Dimensión fija de los embeddings: 1024 (voyage-3). Si se cambia de modelo de
// embeddings a uno con otra dimensión, hace falta una migración nueva que recree
// esta columna y re-vectorice todas las notas existentes.
const EMBEDDING_DIMENSIONS = 1024;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension("vector", { ifNotExists: true });

  pgm.createTable("notes", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    title: { type: "text", notNull: true },
    content: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("chunks", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    note_id: { type: "uuid", notNull: true, references: "notes", onDelete: "CASCADE" },
    content: { type: "text", notNull: true },
    position: { type: "integer", notNull: true },
    embedding: { type: `vector(${EMBEDDING_DIMENSIONS})`, notNull: true },
  });

  pgm.createIndex("chunks", "note_id");

  // HNSW en vez de IVFFlat: no necesita datos ya cargados para construirse bien (IVFFlat
  // sí, calcula sus clusters a partir del contenido existente) — mejor para un dataset
  // personal que crece poco a poco desde cero.
  pgm.sql(`
    create index chunks_embedding_hnsw_idx on chunks
    using hnsw (embedding vector_cosine_ops)
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("chunks");
  pgm.dropTable("notes");
}
