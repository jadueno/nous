export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type NewNote = Pick<Note, "title" | "content">;

export interface Citation {
  noteId: string;
  noteTitle: string;
  excerpt: string;
}

export interface Answer {
  text: string;
  citations: Citation[];
}

export interface RetrievedChunk {
  chunk: { id: string; noteId: string; content: string; position: number };
  noteTitle: string;
  score: number;
}
