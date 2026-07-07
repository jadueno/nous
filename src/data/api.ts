import type { AskResult, ChatMessage, NewNote, Note } from "./types";

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
  list: (tag?: string) => request<Note[]>(`/notes${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`),
  create: (note: NewNote) => request<Note>("/notes", { method: "POST", body: JSON.stringify(note) }),
  update: (id: string, note: NewNote) => request<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(note) }),
  remove: (id: string) => request<void>(`/notes/${id}`, { method: "DELETE" }),
};

export const tagsApi = {
  list: () => request<string[]>("/tags"),
};

// POST /messages responde en SSE (streaming), no un único JSON — se parsea a mano
// bloque a bloque (event: .../data: ...) en vez de esperar al cuerpo entero, así el
// chat puede pintar el texto según llega. EventSource no vale aquí: solo soporta GET,
// y esta petición lleva la pregunta en el body de un POST.
async function readSSE(res: Response, onEvent: (event: string, data: string) => void): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const lines = frame.split("\n");
      const event = lines.find((l) => l.startsWith("event: "))?.slice("event: ".length);
      const data = lines.find((l) => l.startsWith("data: "))?.slice("data: ".length);
      if (event && data) onEvent(event, data);
    }
  }
}

export const chatApi = {
  listMessages: () => request<ChatMessage[]>("/messages"),

  ask: async (question: string, onToken: (chunk: string) => void): Promise<AskResult> => {
    const res = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Error ${res.status} en /messages`);
    }

    let result: AskResult | null = null;
    await readSSE(res, (event, data) => {
      if (event === "token") onToken((JSON.parse(data) as { chunk: string }).chunk);
      else if (event === "done") result = JSON.parse(data) as AskResult;
      else if (event === "error") throw new Error((JSON.parse(data) as { error: string }).error);
    });
    if (!result) throw new Error("El servidor cerró la conexión sin terminar la respuesta");
    return result;
  },

  clear: () => request<void>("/messages", { method: "DELETE" }),
};
