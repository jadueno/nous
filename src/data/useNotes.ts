import { useCallback, useEffect, useState } from "react";
import { notesApi } from "./api";
import type { NewNote, Note } from "./types";

export function useNotes(tagFilter?: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotes(await notesApi.list(tagFilter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [tagFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    notes,
    loading,
    error,
    addNote: async (note: NewNote) => {
      await notesApi.create(note);
      await reload();
    },
    updateNote: async (id: string, note: NewNote) => {
      await notesApi.update(id, note);
      await reload();
    },
    removeNote: async (id: string) => {
      await notesApi.remove(id);
      await reload();
    },
  };
}
