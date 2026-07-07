export interface Note {
  id: string;
  title: string;
  content: string;
  /** Nombres de etiqueta, sin duplicados. Gestionadas aparte (tabla `tags`) para poder
   * renombrarlas/listarlas todas, no un array suelto en la propia nota. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Sin campo de título: se deriva de la primera línea del contenido (ver
 * `deriveTitle` en ports.ts) — una nota rápida es solo texto, sin nada más que rellenar. */
export type NewNote = Pick<Note, "content" | "tags">;

/** Un trozo de una nota, ya vectorizado. El embedding vive en infraestructura
 * (columna vector en Postgres/pgvector) — el dominio solo conoce su existencia
 * a través del puerto de búsqueda, no su representación numérica. */
export interface Chunk {
  id: string;
  noteId: string;
  content: string;
  /** Posición del trozo dentro de la nota (0-based), para poder referenciar "la 2ª parte de X". */
  position: number;
}

/** Un trozo recuperado por similitud, con la nota de origen ya resuelta para citar. */
export interface RetrievedChunk {
  chunk: Chunk;
  noteTitle: string;
  /** Similitud coseno normalizada 0-1 (1 = idéntico). */
  score: number;
}

export interface Citation {
  noteId: string;
  noteTitle: string;
  excerpt: string;
}

/** Un turno de la conversación persistida (tabla `messages`): una sola conversación
 * continua, sin hilos separados — encaja con el uso personal tipo asistente único. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AskResult {
  message: ChatMessage;
  citations: Citation[];
}
