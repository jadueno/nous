import type { Note } from "../../data/types";

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Títulos referenciados en `content` con la sintaxis `[[Título de la nota]]`, sin
 * duplicados y en el orden en que aparecen. Puro: no comprueba si esa nota existe
 * de verdad (ver `resolveLinkedNotes`), solo extrae la sintaxis.
 */
export function extractLinkedTitles(content: string): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const match of content.matchAll(WIKILINK_RE)) {
    const title = match[1].trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    titles.push(title);
  }
  return titles;
}

/**
 * Notas reales enlazadas desde `content` vía `[[Título]]` (comparación por título,
 * sin distinguir mayúsculas/minúsculas). Un `[[Título]]` que no coincide con
 * ninguna nota existente es un enlace roto: se ignora sin más — no hay ni
 * seguimiento de enlaces rotos ni creación implícita de notas nuevas en esta
 * primera versión, para no complicar lo que sigue siendo notas de texto plano.
 */
export function resolveLinkedNotes(content: string, allNotes: Note[]): Note[] {
  const titles = new Set(extractLinkedTitles(content).map((t) => t.toLowerCase()));
  if (titles.size === 0) return [];
  return allNotes.filter((note) => titles.has(note.title.toLowerCase()));
}

/**
 * Notas que enlazan A `target` (su contenido menciona el título de `target` vía
 * `[[...]]`). Es la relación inversa de `resolveLinkedNotes`, para poder mostrar
 * "quién menciona esta nota" sin guardar la relación aparte: con el contenido
 * completo ya cargado en el cliente, recorrerlo es suficiente — no hace falta ida
 * y vuelta al backend ni una tabla de relación propia.
 */
export function findBacklinks(target: Note, allNotes: Note[]): Note[] {
  const targetTitle = target.title.toLowerCase();
  return allNotes.filter(
    (note) => note.id !== target.id && extractLinkedTitles(note.content).some((title) => title.toLowerCase() === targetTitle),
  );
}
