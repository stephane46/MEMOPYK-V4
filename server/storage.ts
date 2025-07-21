import { 
  users, memories, mediaFiles, comments, analytics,
  type User, type InsertUser,
  type Memory, type InsertMemory,
  type MediaFile, type InsertMediaFile,
  type Comment, type InsertComment,
  type Analytics, type InsertAnalytics
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Memory operations
  getMemory(id: number): Promise<Memory | undefined>;
  getMemoriesByUser(userId: number): Promise<Memory[]>;
  getMemories(limit?: number, offset?: number): Promise<Memory[]>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  updateMemory(id: number, updates: Partial<InsertMemory>): Promise<Memory | undefined>;
  deleteMemory(id: number): Promise<boolean>;
  
  // Media file operations
  getMediaFile(id: number): Promise<MediaFile | undefined>;
  getMediaFilesByMemory(memoryId: number): Promise<MediaFile[]>;
  createMediaFile(mediaFile: InsertMediaFile): Promise<MediaFile>;
  deleteMediaFile(id: number): Promise<boolean>;
  
  // Comment operations
  getCommentsByMemory(memoryId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Analytics operations
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getAnalytics(memoryId?: number, userId?: number, limit?: number): Promise<Analytics[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private memories: Map<number, Memory>;
  private mediaFiles: Map<number, MediaFile>;
  private comments: Map<number, Comment>;
  private analytics: Map<number, Analytics>;
  private currentIds: {
    users: number;
    memories: number;
    mediaFiles: number;
    comments: number;
    analytics: number;
  };

  constructor() {
    this.users = new Map();
    this.memories = new Map();
    this.mediaFiles = new Map();
    this.comments = new Map();
    this.analytics = new Map();
    this.currentIds = {
      users: 1,
      memories: 1,
      mediaFiles: 1,
      comments: 1,
      analytics: 1
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const now = new Date();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || "user",
      isActive: insertUser.isActive ?? true,
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Memory operations
  async getMemory(id: number): Promise<Memory | undefined> {
    return this.memories.get(id);
  }

  async getMemoriesByUser(userId: number): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(memory => memory.userId === userId);
  }

  async getMemories(limit: number = 50, offset: number = 0): Promise<Memory[]> {
    const allMemories = Array.from(this.memories.values());
    return allMemories.slice(offset, offset + limit);
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const id = this.currentIds.memories++;
    const now = new Date();
    const memory: Memory = { 
      ...insertMemory,
      description: insertMemory.description || null,
      tags: insertMemory.tags || null,
      location: insertMemory.location || null,
      date: insertMemory.date || null,
      status: insertMemory.status || "active",
      isPublic: insertMemory.isPublic ?? false,
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.memories.set(id, memory);
    return memory;
  }

  async updateMemory(id: number, updates: Partial<InsertMemory>): Promise<Memory | undefined> {
    const memory = this.memories.get(id);
    if (!memory) return undefined;
    
    const updatedMemory = { ...memory, ...updates, updatedAt: new Date() };
    this.memories.set(id, updatedMemory);
    return updatedMemory;
  }

  async deleteMemory(id: number): Promise<boolean> {
    return this.memories.delete(id);
  }

  // Media file operations
  async getMediaFile(id: number): Promise<MediaFile | undefined> {
    return this.mediaFiles.get(id);
  }

  async getMediaFilesByMemory(memoryId: number): Promise<MediaFile[]> {
    return Array.from(this.mediaFiles.values()).filter(file => file.memoryId === memoryId);
  }

  async createMediaFile(insertMediaFile: InsertMediaFile): Promise<MediaFile> {
    const id = this.currentIds.mediaFiles++;
    const mediaFile: MediaFile = { 
      ...insertMediaFile,
      thumbnailUrl: insertMediaFile.thumbnailUrl || null,
      duration: insertMediaFile.duration || null,
      dimensions: insertMediaFile.dimensions || null,
      id, 
      uploadedAt: new Date()
    };
    this.mediaFiles.set(id, mediaFile);
    return mediaFile;
  }

  async deleteMediaFile(id: number): Promise<boolean> {
    return this.mediaFiles.delete(id);
  }

  // Comment operations
  async getCommentsByMemory(memoryId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(comment => comment.memoryId === memoryId);
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.currentIds.comments++;
    const comment: Comment = { 
      ...insertComment, 
      id, 
      createdAt: new Date()
    };
    this.comments.set(id, comment);
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    return this.comments.delete(id);
  }

  // Analytics operations
  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const id = this.currentIds.analytics++;
    const analytics: Analytics = { 
      ...insertAnalytics,
      userId: insertAnalytics.userId || null,
      memoryId: insertAnalytics.memoryId || null,
      metadata: insertAnalytics.metadata || null,
      id, 
      timestamp: new Date()
    };
    this.analytics.set(id, analytics);
    return analytics;
  }

  async getAnalytics(memoryId?: number, userId?: number, limit: number = 100): Promise<Analytics[]> {
    let filtered = Array.from(this.analytics.values());
    
    if (memoryId) {
      filtered = filtered.filter(a => a.memoryId === memoryId);
    }
    if (userId) {
      filtered = filtered.filter(a => a.userId === userId);
    }
    
    return filtered.slice(0, limit);
  }
}

export const storage = new MemStorage();
