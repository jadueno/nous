import type { Pool } from "pg";
import type { ChatRepository } from "../../../domain/ports.js";
import type { ChatMessage } from "../../../domain/types.js";

interface MessageRow {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

function toMessage(row: MessageRow): ChatMessage {
  return { id: row.id, role: row.role as ChatMessage["role"], content: row.content, createdAt: row.created_at };
}

export function createChatRepository(pool: Pool): ChatRepository {
  return {
    list: async (limit) => {
      if (limit === undefined) {
        const { rows } = await pool.query<MessageRow>("select * from messages order by created_at asc");
        return rows.map(toMessage);
      }
      // Los últimos `limit` en orden cronológico: se toman los más recientes primero
      // (para poder limitar) y se invierten, en vez de pedir "order by asc limit N"
      // (que daría los N más antiguos, justo lo contrario de lo que queremos).
      const { rows } = await pool.query<MessageRow>("select * from messages order by created_at desc limit $1", [
        limit,
      ]);
      return rows.map(toMessage).reverse();
    },

    append: async (role, content) => {
      const { rows } = await pool.query<MessageRow>(
        "insert into messages (role, content) values ($1, $2) returning *",
        [role, content],
      );
      return toMessage(rows[0]);
    },

    clear: async () => {
      await pool.query("delete from messages");
    },
  };
}
