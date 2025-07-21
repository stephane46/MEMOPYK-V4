import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMemorySchema, insertMediaFileSchema, insertCommentSchema, insertAnalyticsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // User Routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  // Memory Routes
  app.get("/api/memories", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const memories = await storage.getMemories(limit, offset);
      res.json(memories);
    } catch (error) {
      res.status(500).json({ error: "Failed to get memories" });
    }
  });

  app.get("/api/memories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const memory = await storage.getMemory(id);
      
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: "Failed to get memory" });
    }
  });

  app.post("/api/memories", async (req, res) => {
    try {
      const memoryData = insertMemorySchema.parse(req.body);
      const memory = await storage.createMemory(memoryData);
      res.status(201).json(memory);
    } catch (error) {
      res.status(400).json({ error: "Invalid memory data" });
    }
  });

  app.put("/api/memories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertMemorySchema.partial().parse(req.body);
      const memory = await storage.updateMemory(id, updates);
      
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      
      res.json(memory);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/memories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMemory(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Memory not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  app.get("/api/users/:userId/memories", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const memories = await storage.getMemoriesByUser(userId);
      res.json(memories);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user memories" });
    }
  });

  // Media File Routes
  app.get("/api/memories/:memoryId/media", async (req, res) => {
    try {
      const memoryId = parseInt(req.params.memoryId);
      const mediaFiles = await storage.getMediaFilesByMemory(memoryId);
      res.json(mediaFiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to get media files" });
    }
  });

  app.post("/api/media", async (req, res) => {
    try {
      const mediaData = insertMediaFileSchema.parse(req.body);
      const mediaFile = await storage.createMediaFile(mediaData);
      res.status(201).json(mediaFile);
    } catch (error) {
      res.status(400).json({ error: "Invalid media file data" });
    }
  });

  app.delete("/api/media/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMediaFile(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Media file not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media file" });
    }
  });

  // Comment Routes
  app.get("/api/memories/:memoryId/comments", async (req, res) => {
    try {
      const memoryId = parseInt(req.params.memoryId);
      const comments = await storage.getCommentsByMemory(memoryId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteComment(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Analytics Routes
  app.post("/api/analytics", async (req, res) => {
    try {
      const analyticsData = insertAnalyticsSchema.parse(req.body);
      const analytics = await storage.createAnalytics(analyticsData);
      res.status(201).json(analytics);
    } catch (error) {
      res.status(400).json({ error: "Invalid analytics data" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const memoryId = req.query.memoryId ? parseInt(req.query.memoryId as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const analytics = await storage.getAnalytics(memoryId, userId, limit);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
