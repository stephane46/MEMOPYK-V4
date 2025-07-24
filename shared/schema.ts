import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, numeric, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (admin authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull()
});

// Hero videos table - bilingual structure
export const heroVideos = pgTable("hero_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  urlEn: text("url_en").notNull(),
  urlFr: text("url_fr").notNull(),
  useSameVideo: boolean("use_same_video").default(true), // When true, use urlEn for both languages
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Hero text settings table - bilingual structure
export const heroTextSettings = pgTable("hero_text_settings", {
  id: varchar("id").primaryKey(),
  titleFr: varchar("title_fr").notNull(),
  titleEn: varchar("title_en").notNull(),
  subtitleFr: varchar("subtitle_fr"),
  subtitleEn: varchar("subtitle_en"),
  isActive: boolean("is_active").notNull().default(false),
  fontSize: integer("font_size").default(60),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Gallery items table - bilingual structure
export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Core display fields
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  priceEn: text("price_en"), // Text field for prices like "USD 145"
  priceFr: text("price_fr"), // Text field for prices like "145 USD"
  
  // Gallery card content fields
  sourceEn: text("source_en"), // "80 photos & 10 videos" - top overlay text
  sourceFr: text("source_fr"), // "80 photos et 10 vidéos" - top overlay text
  durationEn: text("duration_en"), // "2 minutes" - duration with film icon (up to 5 lines)
  durationFr: text("duration_fr"), // "2 minutes" - duration with film icon (up to 5 lines)
  situationEn: text("situation_en"), // "The Client is a wife..." - client description (up to 5 lines)
  situationFr: text("situation_fr"), // "Le client est une épouse..." - client description (up to 5 lines)
  storyEn: text("story_en"), // "This film shows..." - story description (up to 5 lines)
  storyFr: text("story_fr"), // "Ce film montre..." - story description (up to 5 lines)
  
  // Sorry message for when no video is available
  sorryMessageEn: text("sorry_message_en"), // "Sorry, we cannot show you the video at this stage"
  sorryMessageFr: text("sorry_message_fr"), // "Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
  
  // Media fields
  videoUrlEn: text("video_url_en"),
  videoUrlFr: text("video_url_fr"),
  useSameVideo: boolean("use_same_video").default(true), // When true, use videoUrlEn for both languages
  videoWidth: integer("video_width"),
  videoHeight: integer("video_height"),
  videoOrientation: text("video_orientation"), // "portrait" or "landscape"
  
  // Image fields
  imageUrlEn: text("image_url_en"),
  imageUrlFr: text("image_url_fr"),
  staticImageUrl: text("static_image_url"), // 300x200 cropped JPEG for thumbnails
  cropSettings: jsonb("crop_settings"), // Stores crop position settings for re-editing
  
  // System fields
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// FAQ sections table - bilingual structure
export const faqSections = pgTable("faq_sections", {
  id: varchar("id").primaryKey(),
  key: varchar("key").notNull(),
  nameEn: varchar("name_en").notNull(),
  nameFr: varchar("name_fr").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// FAQs table - bilingual structure
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionNameEn: text("section_name_en").notNull(),
  sectionNameFr: text("section_name_fr").notNull(),
  sectionOrder: integer("section_order").default(0),
  orderIndex: integer("order_index").default(0),
  questionEn: text("question_en").notNull(),
  questionFr: text("question_fr").notNull(),
  answerEn: text("answer_en").notNull(),
  answerFr: text("answer_fr").notNull(),
  isActive: boolean("is_active").default(true),
  sectionId: varchar("section_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  package: text("package"),
  preferredContact: text("preferred_contact"),
  status: text("status").default("new"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Legal documents table - bilingual structure
export const legalDocuments = pgTable("legal_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  contentEn: text("content_en").notNull(),
  contentFr: text("content_fr").notNull(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});

// CTA settings table - bilingual structure
export const ctaSettings = pgTable("cta_settings", {
  id: varchar("id").primaryKey(),
  titleFr: varchar("title_fr").notNull(),
  titleEn: varchar("title_en").notNull(),
  buttonTextFr: varchar("button_text_fr").notNull(),
  buttonTextEn: varchar("button_text_en").notNull(),
  buttonUrl: varchar("button_url").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// SEO settings table - bilingual structure
export const seoSettings = pgTable("seo_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  page: text("page").notNull(),
  urlSlugEn: text("url_slug_en"),
  urlSlugFr: text("url_slug_fr"),
  metaTitleEn: text("meta_title_en"),
  metaTitleFr: text("meta_title_fr"),
  metaDescriptionEn: text("meta_description_en"),
  metaDescriptionFr: text("meta_description_fr"),
  ogTitleEn: text("og_title_en"),
  ogTitleFr: text("og_title_fr"),
  ogDescriptionEn: text("og_description_en"),
  ogDescriptionFr: text("og_description_fr"),
  ogImageUrl: text("og_image_url"),
  twitterTitleEn: text("twitter_title_en"),
  twitterTitleFr: text("twitter_title_fr"),
  twitterDescriptionEn: text("twitter_description_en"),
  twitterDescriptionFr: text("twitter_description_fr"),
  twitterImageUrl: text("twitter_image_url"),
  canonicalUrl: text("canonical_url"),
  robotsIndex: boolean("robots_index").default(true),
  robotsFollow: boolean("robots_follow").default(true),
  jsonLd: jsonb("json_ld"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Deployment history table
export const deploymentHistory = pgTable("deployment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  logs: text("logs"),
  host: text("host"),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert schemas for all tables
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertHeroVideoSchema = createInsertSchema(heroVideos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHeroTextSettingsSchema = createInsertSchema(heroTextSettings).omit({ createdAt: true, updatedAt: true });
export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFaqSectionSchema = createInsertSchema(faqSections).omit({ createdAt: true, updatedAt: true });
export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({ id: true, updatedAt: true });
export const insertCtaSettingsSchema = createInsertSchema(ctaSettings).omit({ createdAt: true, updatedAt: true });
export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({ id: true, createdAt: true });

// Select types for all tables
export type User = typeof users.$inferSelect;
export type HeroVideo = typeof heroVideos.$inferSelect;
export type HeroTextSettings = typeof heroTextSettings.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type FaqSection = typeof faqSections.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type CtaSettings = typeof ctaSettings.$inferSelect;
export type SeoSettings = typeof seoSettings.$inferSelect;
export type DeploymentHistory = typeof deploymentHistory.$inferSelect;

// Insert types for all tables
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHeroVideo = z.infer<typeof insertHeroVideoSchema>;
export type InsertHeroTextSettings = z.infer<typeof insertHeroTextSettingsSchema>;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type InsertFaqSection = z.infer<typeof insertFaqSectionSchema>;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;
export type InsertCtaSettings = z.infer<typeof insertCtaSettingsSchema>;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;
export type InsertDeploymentHistory = z.infer<typeof insertDeploymentHistorySchema>;