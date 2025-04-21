import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// Define the saved content table
export const savedContent = pgTable("saved_content", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  contentType: text("content_type").notNull(), // "image", "voiceover", "text"
  content: text("content").notNull(), // URL for images/audio, actual text for text content
  tags: text("tags"), // Stored as JSON string of tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false),
  sharedUrl: text("shared_url"), // Generated URL for public sharing
});

// Create insert schema with proper handling for boolean and text fields
export const insertSavedContentSchema = createInsertSchema(savedContent)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    tags: z.string().optional(),
    isPublic: z.boolean().optional(),
    sharedUrl: z.string().optional()
  });

// Define types
export type InsertSavedContent = z.infer<typeof insertSavedContentSchema>;
export type SavedContent = typeof savedContent.$inferSelect;

// Content types enum
export enum ContentType {
  IMAGE = "image",
  VOICEOVER = "voiceover",
  TEXT = "text",
}