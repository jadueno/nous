import type { EmbeddingProvider, LLMProvider } from "../../domain/ports.js";
import type { RetrievedChunk } from "../../domain/types.js";

const DIMENSIONS = 1024;

// Palabras vacías del español: sin filtrarlas, dos notas sin nada que ver comparten
// igualmente "el", "de", "le"... y salen con una similitud espuria — hace que el
// ranking de la demo/tests se parezca más al de un embedding real (que sí capta que
// estas palabras no aportan significado). Incluye pronombres átonos (le/les/me/te...):
// sin ellos, dos notas con la misma plantilla ("A X le gusta Y") pesan tanto por el
// "le gusta" compartido como por el nombre real — bug real encontrado al preguntar
// "¿Qué le gusta comer a Flor?" y que citara también una nota sobre Juan.
const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "y", "o",
  "a", "que", "es", "se", "su", "sus", "para", "con", "por", "lo", "al", "como",
  "le", "les", "me", "te", "nos", "os", "mi", "mis", "tu", "tus",
]);

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Embedding "hashing trick" (bolsa de palabras con hash, normalizado a longitud 1):
 * determinista y sin red, pero con similitud coseno que sí refleja solapamiento de
 * palabras con significado — suficiente para que los tests de integración y E2E
 * verifiquen ranking real sin depender de una API de pago ni de claves.
 *
 * Sigue siendo una bolsa de palabras cruda, sin ningún tipo de ponderación por
 * relevancia (como haría un embedding real): dos notas con la misma estructura de
 * frase pero distinto sujeto ("A Flor le gusta cenar pizza" vs "A Juan le gusta comer
 * fideos") pueden seguir empatando en similitud, porque cada palabra cuenta igual.
 * Para desambiguar casos así de verdad hace falta un proveedor real (Voyage/Claude,
 * ver ANTHROPIC_API_KEY/VOYAGE_API_KEY en backend/.env). */
function hashEmbedding(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  const words = (stripAccents(text.toLowerCase()).match(/[a-z0-9]+/g) ?? []).filter((w) => !STOPWORDS.has(w));
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    vector[hash % DIMENSIONS] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export function createFakeEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: async (texts) => texts.map(hashEmbedding),
  };
}

export function createFakeLLMProvider(): LLMProvider {
  return {
    // El historial no afecta a la respuesta simulada: los tests que necesitan
    // comprobar que el historial llega hasta aquí usan su propio LLMProvider de espía
    // (ver application/chat.test.ts), no este fake. Se emite palabra a palabra por
    // onToken (en vez de una sola vez) para poder probar el streaming end-to-end sin
    // depender de un proveedor real.
    answer: async (question: string, context: RetrievedChunk[], _history, onToken) => {
      const titles = [...new Set(context.map((c) => c.noteTitle))].join(", ");
      const text = `[respuesta simulada] Sobre "${question}", según tus notas (${titles}).`;
      text.split(" ").forEach((word, i) => onToken(i === 0 ? word : ` ${word}`));
      return text;
    },
  };
}
