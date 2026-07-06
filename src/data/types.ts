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

export interface Answer {
  text: string;
  citations: Citation[];
}
