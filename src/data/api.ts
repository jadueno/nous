import type { Answer, NewNote, Note, RetrievedChunk } from "./types";

// Usa el mismo host desde el que se cargó la página (localhost, IP de LAN o de
// Tailscale) en vez de "localhost" fijo, que en el móvil apuntaría al propio móvil.
export const API_URL = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3002`;

// Solo se envía si el backend tiene API_TOKEN activado; vacío por defecto.
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status} en ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const notesApi = {
  list: () => request<Note[]>("/notes"),
  get: (id: string) => request<Note>(`/notes/${id}`),
  create: (note: NewNote) => request<Note>("/notes", { method: "POST", body: JSON.stringify(note) }),
  update: (id: string, note: NewNote) => request<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(note) }),
  remove: (id: string) => request<void>(`/notes/${id}`, { method: "DELETE" }),
};

export const askApi = {
  ask: (question: string) => request<Answer>("/ask", { method: "POST", body: JSON.stringify({ question }) }),
};

export const searchApi = {
  search: (query: string) => request<RetrievedChunk[]>(`/search?q=${encodeURIComponent(query)}`),
};
