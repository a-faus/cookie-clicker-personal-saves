import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const gameSaves = sqliteTable("game_saves", {
  userId: text("user_id").primaryKey(),
  save: text("save").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
