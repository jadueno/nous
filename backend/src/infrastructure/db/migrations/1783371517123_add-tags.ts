import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("tags", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    name: { type: "text", notNull: true, unique: true },
  });

  pgm.createTable("note_tags", {
    note_id: { type: "uuid", notNull: true, references: "notes", onDelete: "CASCADE" },
    tag_id: { type: "uuid", notNull: true, references: "tags", onDelete: "CASCADE" },
  });
  pgm.addConstraint("note_tags", "note_tags_pkey", { primaryKey: ["note_id", "tag_id"] });
  pgm.createIndex("note_tags", "tag_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("note_tags");
  pgm.dropTable("tags");
}
