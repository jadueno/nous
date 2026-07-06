import type { NewNote, Note, RetrievedChunk } from "./types.js";

export interface NoteRepository {
  list(): Promise<Note[]>;
  get(id: string): Promise<Note | null>;
  create(note: NewNote): Promise<Note>;
  update(id: string, note: NewNote): Promise<Note | null>;
  remove(id: string): Promise<void>;
}

export interface ChunkRepository {
  /** Sustituye todos los trozos de una nota (se llama tras crear/editar una nota). */
  replaceForNote(noteId: string, chunks: { content: string; position: number; embedding: number[] }[]): Promise<void>;
  removeForNote(noteId: string): Promise<void>;
  /** Busca los `limit` trozos más similares a `embedding` (similitud coseno), de cualquier nota. */
  searchSimilar(embedding: number[], limit: number): Promise<RetrievedChunk[]>;
}

/**
 * Puerto de embeddings: convierte texto en vectores. Independiente del puerto de LLM
 * a propósito — Anthropic no ofrece embeddings propios, así que el adaptador real
 * combina un proveedor de embeddings (Voyage AI) con uno de LLM (Claude); en tests e
 * ingesta local ambos puertos los cubre el mismo FakeProvider determinista.
 */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export interface LLMProvider {
  /** Genera una respuesta a partir de la pregunta y los trozos de contexto recuperados. */
  answer(question: string, context: RetrievedChunk[]): Promise<string>;
}

/** Trocea el contenido de una nota en fragmentos manejables para vectorizar. Vive en el
 * dominio (no en infraestructura) porque es una regla de negocio pura, sin dependencias externas. */
export function chunkText(content: string, maxChars = 800): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [content.trim()].filter(Boolean);
}
