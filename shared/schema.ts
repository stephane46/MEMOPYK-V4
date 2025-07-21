import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("user"), // user, admin
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Memories table (main content)
export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // family, travel, milestone, etc.
  tags: text("tags").array(), // array of tag strings
  location: text("location"),
  date: timestamp("date"),
  isPublic: boolean("is_public").notNull().default(false),
  status: text("status").notNull().default("active"), // active, archived, deleted
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Media files table
export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  memoryId: integer("memory_id").notNull().references(() => memories.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // for videos in seconds
  dimensions: jsonb("dimensions"), // {width: number, height: number}
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow()
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  memoryId: integer("memory_id").notNull().references(() => memories.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Analytics table
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  memoryId: integer("memory_id").references(() => memories.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // view, like, share, download
  metadata: jsonb("metadata"), // additional data
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  uploadedAt: true
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  timestamp: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Memory = typeof memories.$inferSelect;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
