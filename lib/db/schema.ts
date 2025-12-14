import type { InferSelectModel } from "drizzle-orm"
import { pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core"

// Users synced from Supabase auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
})

export type User = InferSelectModel<typeof users>

// Simple ownership mapping for v0 chats
export const chat_ownerships = pgTable(
  "chat_ownerships",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    v0_chat_id: varchar("v0_chat_id", { length: 255 }).notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    unique_v0_chat: unique().on(table.v0_chat_id),
  }),
)

export type ChatOwnership = InferSelectModel<typeof chat_ownerships>

// Track anonymous chat creation by IP for rate limiting
export const anonymous_chat_logs = pgTable("anonymous_chat_logs", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  ip_address: varchar("ip_address", { length: 45 }).notNull(), // IPv6 can be up to 45 chars
  v0_chat_id: varchar("v0_chat_id", { length: 255 }).notNull(), // v0 API chat ID
  created_at: timestamp("created_at").notNull().defaultNow(),
})

export type AnonymousChatLog = InferSelectModel<typeof anonymous_chat_logs>
