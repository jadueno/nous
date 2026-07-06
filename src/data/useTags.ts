import { useEffect, useState } from "react";
import { tagsApi } from "./api";

/** Todas las etiquetas usadas en alguna nota, para la barra de filtro. Se refresca
 * cuando cambia `refreshKey` (p. ej. tras crear/editar/borrar una nota). */
export function useTags(refreshKey: unknown) {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    tagsApi.list().then(setTags).catch(() => setTags([]));
  }, [refreshKey]);

  return tags;
}
