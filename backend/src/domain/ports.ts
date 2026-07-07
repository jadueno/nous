import type { ChatMessage, Note, RetrievedChunk } from "./types.js";

/** El repositorio siempre persiste título + contenido + etiquetas (ya resueltas a
 * nombres de etiqueta, sin duplicados); es el caso de uso quien deriva el título y
 * normaliza las etiquetas antes de llamarlo — el repositorio no sabe nada de esas
 * reglas de negocio, solo persiste. */
interface StoredNote {
  title: string;
  content: string;
  tags: string[];
}

export interface NoteRepository {
  list(filter?: { tag?: string }): Promise<Note[]>;
  create(note: StoredNote): Promise<Note>;
  update(id: string, note: StoredNote): Promise<Note | null>;
  remove(id: string): Promise<void>;
  /** Todas las etiquetas existentes (para el filtro/autocompletado), ordenadas alfabéticamente. */
  listTags(): Promise<string[]>;
}

export interface ChunkRepository {
  /** Sustituye todos los trozos de una nota (se llama tras crear/editar una nota). */
  replaceForNote(noteId: string, chunks: { content: string; position: number; embedding: number[] }[]): Promise<void>;
  removeForNote(noteId: string): Promise<void>;
  /** Busca los `limit` trozos más similares a `embedding` (similitud coseno), de cualquier nota. */
  searchSimilar(embedding: number[], limit: number): Promise<RetrievedChunk[]>;
}

export interface ChatRepository {
  /** Últimos `limit` mensajes en orden cronológico (más antiguo primero); todos si se omite. */
  list(limit?: number): Promise<ChatMessage[]>;
  append(role: ChatMessage["role"], content: string): Promise<ChatMessage>;
  clear(): Promise<void>;
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
  /** Genera una respuesta a partir de la pregunta, los trozos de contexto recuperados y los
   * últimos turnos de la conversación (para preguntas de seguimiento tipo "¿y en qué cantidad?"). */
  answer(question: string, context: RetrievedChunk[], history: ChatMessage[]): Promise<string>;
}

const MAX_TITLE_LENGTH = 80;

/** Deriva el título a mostrar (lista de notas, citas del chat) de la primera línea
 * con contenido, truncada si es muy larga. Sin campo de título aparte que rellenar:
 * una nota rápida es solo texto, y el título siempre refleja el contenido actual
 * (no puede quedarse desactualizado como pasaría con un campo editado a mano). */
export function deriveTitle(content: string): string {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Sin título";
  return firstLine.length > MAX_TITLE_LENGTH ? `${firstLine.slice(0, MAX_TITLE_LENGTH).trim()}…` : firstLine;
}

/** Limpia la lista de etiquetas de una nota: recorta espacios, descarta vacías y quita
 * duplicados exactos (conserva may/min tal cual las escribió el usuario — no fuerza
 * minúsculas, es una decisión de UX, no de corrección). */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
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
