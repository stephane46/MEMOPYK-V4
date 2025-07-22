import type { Express } from "express";
import { createServer, type Server } from "http";
import { hybridStorage } from "./hybrid-storage";
import { z } from "zod";

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // MEMOPYK Platform Content API Routes
  
  // Hero Videos - Video carousel content
  app.get("/api/hero-videos", async (req, res) => {
    try {
      const videos = await hybridStorage.getHeroVideos();
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero videos" });
    }
  });

  
  // Hero Text Settings - Hero section text content
  app.get("/api/hero-text", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const heroText = await hybridStorage.getHeroTextSettings(language);
      res.json(heroText);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero text" });
    }
  });

  // Gallery Items - Portfolio gallery content  
  app.get("/api/gallery", async (req, res) => {
    try {
      const galleryItems = await hybridStorage.getGalleryItems();
      res.json(galleryItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  // FAQ Sections - Frequently asked questions sections
  app.get("/api/faq-sections", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const sections = await hybridStorage.getFaqSections(language);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ sections" });
    }
  });

  // FAQs - Individual FAQ items
  app.get("/api/faqs", async (req, res) => {
    try {
      const sectionId = req.query.sectionId as string;
      const faqs = await hybridStorage.getFaqs(sectionId);
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  // Contact Form - Handle contact form submissions
  app.post("/api/contact", async (req, res) => {
    try {
      const contactData = contactFormSchema.parse(req.body);
      const contact = await hybridStorage.createContact(contactData);
      res.status(201).json({ 
        success: true, 
        message: "Contact form submitted successfully",
        id: contact.id 
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // Get all contacts (admin only)
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await hybridStorage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  // Legal Documents - Privacy policy, terms of service, etc.
  app.get("/api/legal", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const documents = await hybridStorage.getLegalDocuments(language);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal documents" });
    }
  });

  // Get specific legal document by type
  app.get("/api/legal/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const language = req.query.lang as string;
      const documents = await hybridStorage.getLegalDocuments(language);
      const document = documents.find(doc => doc.type === type);
      
      if (!document) {
        return res.status(404).json({ error: "Legal document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal document" });
    }
  });

  // CTA Settings - Call-to-action buttons and content
  app.get("/api/cta-settings", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const ctaSettings = await hybridStorage.getCtaSettings(language);
      res.json(ctaSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get CTA settings" });
    }
  });

  // SEO Settings - Meta tags, titles, descriptions for pages
  app.get("/api/seo-settings", async (req, res) => {
    try {
      const page = req.query.page as string;
      const language = req.query.lang as string;
      const seoSettings = await hybridStorage.getSeoSettings(page, language);
      res.json(seoSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get SEO settings" });
    }
  });

  // Health check route  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "MEMOPYK API operational", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // API Documentation route
  app.get("/api", (req, res) => {
    res.json({
      name: "MEMOPYK Platform API",
      version: "1.0.0",
      description: "Bilingual content management API for MEMOPYK memory film platform",
      endpoints: {
        content: {
          "GET /api/hero-videos": "Get hero carousel videos",
          "GET /api/hero-text?lang=": "Get hero section text (fr/en)",
          "GET /api/gallery": "Get portfolio gallery items",
          "GET /api/faq-sections?lang=": "Get FAQ sections (fr/en)",
          "GET /api/faqs?sectionId=": "Get FAQs by section",
          "GET /api/legal?lang=": "Get legal documents (fr/en)",
          "GET /api/legal/:type?lang=": "Get specific legal document",
          "GET /api/cta-settings?lang=": "Get call-to-action settings",
          "GET /api/seo-settings?page=&lang=": "Get SEO settings for page"
        },
        forms: {
          "POST /api/contact": "Submit contact form",
          "GET /api/contacts": "Get all contact submissions (admin)"
        },
        system: {
          "GET /api/health": "API health check",
          "GET /api": "API documentation"
        }
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
