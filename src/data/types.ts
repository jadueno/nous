export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Sin campo de título: el backend lo deriva de la primera línea del contenido. */
export type NewNote = Pick<Note, "content" | "tags">;

export interface Citation {
  noteId: string;
  noteTitle: string;
  excerpt: string;
}

/** Un turno de la conversación, persistido en el backend: una sola conversación
 * continua (sin hilos separados), recuperable al recargar o cambiar de dispositivo. */
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
