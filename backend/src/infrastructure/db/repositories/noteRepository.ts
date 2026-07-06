import type { Pool } from "pg";
import type { NoteRepository } from "../../../domain/ports.js";
import type { Note } from "../../../domain/types.js";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return { id: row.id, title: row.title, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function createNoteRepository(pool: Pool): NoteRepository {
  return {
    list: async () => {
      const { rows } = await pool.query<NoteRow>("select * from notes order by updated_at desc");
      return rows.map(toNote);
    },

    get: async (id) => {
      const { rows } = await pool.query<NoteRow>("select * from notes where id = $1", [id]);
      return rows[0] ? toNote(rows[0]) : null;
    },

    create: async (input) => {
      const { rows } = await pool.query<NoteRow>(
        "insert into notes (title, content) values ($1, $2) returning *",
        [input.title, input.content],
      );
      return toNote(rows[0]);
    },

    update: async (id, input) => {
      const { rows } = await pool.query<NoteRow>(
        "update notes set title = $2, content = $3, updated_at = now() where id = $1 returning *",
        [id, input.title, input.content],
      );
      return rows[0] ? toNote(rows[0]) : null;
    },

    remove: async (id) => {
      await pool.query("delete from notes where id = $1", [id]);
    },
  };
}
