import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (admin authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Hero videos table
export const heroVideos = pgTable("hero_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Hero text settings table  
export const heroTextSettings = pgTable("hero_text_settings", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(), // 'fr' or 'en'
  mainHeading: text("main_heading").notNull(),
  subHeading: text("sub_heading"),
  ctaText: text("cta_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Gallery items table
export const galleryItems = pgTable("gallery_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  order: integer("order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// FAQ sections table
export const faqSections = pgTable("faq_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  language: text("language").notNull(), // 'fr' or 'en'
  order: integer("order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// FAQs table
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => faqSections.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, read, replied
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Legal documents table
export const legalDocuments = pgTable("legal_documents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // privacy, terms, cookies
  language: text("language").notNull(), // 'fr' or 'en'
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: text("version").notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// CTA settings table
export const ctaSettings = pgTable("cta_settings", {
  id: serial("id").primaryKey(),
  language: text("language").notNull(), // 'fr' or 'en'
  title: text("title").notNull(),
  description: text("description"),
  buttonText: text("button_text").notNull(),
  buttonUrl: text("button_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// SEO settings table
export const seoSettings = pgTable("seo_settings", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(), // home, gallery, contact, etc.
  language: text("language").notNull(), // 'fr' or 'en'
  title: text("title").notNull(),
  description: text("description").notNull(),
  keywords: text("keywords"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Deployment history table
export const deploymentHistory = pgTable("deployment_history", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  description: text("description"),
  deployedBy: text("deployed_by").notNull(),
  status: text("status").notNull(), // success, failed, rollback
  deployedAt: timestamp("deployed_at").notNull().defaultNow()
});

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertHeroVideoSchema = createInsertSchema(heroVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertHeroTextSettingsSchema = createInsertSchema(heroTextSettings).omit({
  id: true,
  updatedAt: true
});

export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertFaqSectionSchema = createInsertSchema(faqSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true
});

export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCtaSettingsSchema = createInsertSchema(ctaSettings).omit({
  id: true,
  updatedAt: true
});

export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({
  id: true,
  updatedAt: true
});

export const insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({
  id: true,
  deployedAt: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type HeroVideo = typeof heroVideos.$inferSelect;
export type InsertHeroVideo = z.infer<typeof insertHeroVideoSchema>;

export type HeroTextSettings = typeof heroTextSettings.$inferSelect;
export type InsertHeroTextSettings = z.infer<typeof insertHeroTextSettingsSchema>;

export type GalleryItem = typeof galleryItems.$inferSelect;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;

export type FaqSection = typeof faqSections.$inferSelect;
export type InsertFaqSection = z.infer<typeof insertFaqSectionSchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;

export type CtaSettings = typeof ctaSettings.$inferSelect;
export type InsertCtaSettings = z.infer<typeof insertCtaSettingsSchema>;

export type SeoSettings = typeof seoSettings.$inferSelect;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;

export type DeploymentHistory = typeof deploymentHistory.$inferSelect;
export type InsertDeploymentHistory = z.infer<typeof insertDeploymentHistorySchema>;
