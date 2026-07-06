import type { Pool } from "pg";
import type { ChunkRepository } from "../../../domain/ports.js";
import type { RetrievedChunk } from "../../../domain/types.js";

/** pgvector espera el vector como literal de texto "[0.1,0.2,...]", cast a ::vector. */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function createChunkRepository(pool: Pool): ChunkRepository {
  return {
    replaceForNote: async (noteId, chunks) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("delete from chunks where note_id = $1", [noteId]);
        for (const chunk of chunks) {
          await client.query(
            "insert into chunks (note_id, content, position, embedding) values ($1, $2, $3, $4::vector)",
            [noteId, chunk.content, chunk.position, toVectorLiteral(chunk.embedding)],
          );
        }
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    },

    removeForNote: async (noteId) => {
      await pool.query("delete from chunks where note_id = $1", [noteId]);
    },

    searchSimilar: async (embedding, limit) => {
      // `<=>` es la distancia coseno de pgvector (1 - similitud coseno para vectores
      // normalizados); se invierte para exponer un score 0-1 donde 1 = idéntico.
      const { rows } = await pool.query<{
        id: string;
        note_id: string;
        content: string;
        position: number;
        note_title: string;
        distance: number;
      }>(
        `select c.id, c.note_id, c.content, c.position, n.title as note_title,
                c.embedding <=> $1::vector as distance
         from chunks c
         join notes n on n.id = c.note_id
         order by c.embedding <=> $1::vector
         limit $2`,
        [toVectorLiteral(embedding), limit],
      );

      const results: RetrievedChunk[] = rows.map((row) => ({
        chunk: { id: row.id, noteId: row.note_id, content: row.content, position: row.position },
        noteTitle: row.note_title,
        score: 1 - row.distance,
      }));
      return results;
    },
  };
}
