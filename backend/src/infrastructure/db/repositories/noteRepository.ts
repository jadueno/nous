import type { Pool, PoolClient } from "pg";
import type { NoteRepository } from "../../../domain/ports.js";
import type { Note } from "../../../domain/types.js";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// LEFT JOIN + array_agg: una sola consulta trae la nota y sus etiquetas juntas, sin
// N+1. `coalesce(... filter (where t.name is not null), '{}')` evita que una nota sin
// etiquetas salga como `[null]` en vez de un array vacío.
const SELECT_NOTE_WITH_TAGS = `
  select n.*, coalesce(array_agg(t.name order by t.name) filter (where t.name is not null), '{}') as tags
  from notes n
  left join note_tags nt on nt.note_id = n.id
  left join tags t on t.id = nt.tag_id
`;

/** Encuentra o crea cada etiqueta por nombre y devuelve sus ids — "find or create"
 * vía upsert, en vez de un select seguido de un insert condicional (evita una
 * condición de carrera si dos peticiones crean la misma etiqueta a la vez). */
async function resolveTagIds(client: PoolClient, tagNames: string[]): Promise<string[]> {
  if (tagNames.length === 0) return [];
  const ids: string[] = [];
  for (const name of tagNames) {
    const { rows } = await client.query<{ id: string }>(
      "insert into tags (name) values ($1) on conflict (name) do update set name = excluded.name returning id",
      [name],
    );
    ids.push(rows[0].id);
  }
  return ids;
}

async function replaceNoteTags(client: PoolClient, noteId: string, tagNames: string[]): Promise<void> {
  const tagIds = await resolveTagIds(client, tagNames);
  await client.query("delete from note_tags where note_id = $1", [noteId]);
  for (const tagId of tagIds) {
    await client.query("insert into note_tags (note_id, tag_id) values ($1, $2)", [noteId, tagId]);
  }
}

async function getNoteWithTags(pool: Pool, id: string): Promise<Note | null> {
  const { rows } = await pool.query<NoteRow>(`${SELECT_NOTE_WITH_TAGS} where n.id = $1 group by n.id`, [id]);
  return rows[0] ? toNote(rows[0]) : null;
}

export function createNoteRepository(pool: Pool): NoteRepository {
  return {
    list: async (filter) => {
      if (filter?.tag) {
        const { rows } = await pool.query<NoteRow>(
          `${SELECT_NOTE_WITH_TAGS}
           where n.id in (
             select nt2.note_id from note_tags nt2 join tags t2 on t2.id = nt2.tag_id where t2.name = $1
           )
           group by n.id
           order by n.updated_at desc`,
          [filter.tag],
        );
        return rows.map(toNote);
      }
      const { rows } = await pool.query<NoteRow>(`${SELECT_NOTE_WITH_TAGS} group by n.id order by n.updated_at desc`);
      return rows.map(toNote);
    },

    get: (id) => getNoteWithTags(pool, id),

    create: async (input) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<{ id: string }>(
          "insert into notes (title, content) values ($1, $2) returning id",
          [input.title, input.content],
        );
        const noteId = rows[0].id;
        await replaceNoteTags(client, noteId, input.tags);
        await client.query("commit");
        return (await getNoteWithTags(pool, noteId))!;
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    },

    update: async (id, input) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rowCount } = await client.query(
          "update notes set title = $2, content = $3, updated_at = now() where id = $1",
          [id, input.title, input.content],
        );
        if (rowCount === 0) {
          await client.query("rollback");
          return null;
        }
        await replaceNoteTags(client, id, input.tags);
        await client.query("commit");
        return getNoteWithTags(pool, id);
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    },

    remove: async (id) => {
      await pool.query("delete from notes where id = $1", [id]);
    },

    listTags: async () => {
      const { rows } = await pool.query<{ name: string }>("select name from tags order by name");
      return rows.map((r) => r.name);
    },
  };
}
