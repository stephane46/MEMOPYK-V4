import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface HybridStorageInterface {
  // Hero videos
  getHeroVideos(): Promise<any[]>;
  
  // Hero text settings  
  getHeroTextSettings(language?: string): Promise<any[]>;
  
  // Gallery items
  getGalleryItems(): Promise<any[]>;
  
  // FAQ sections and FAQs
  getFaqSections(language?: string): Promise<any[]>;
  getFaqs(sectionId?: string): Promise<any[]>;
  
  // Contacts
  getContacts(): Promise<any[]>;
  createContact(contact: any): Promise<any>;
  
  // Legal documents
  getLegalDocuments(language?: string): Promise<any[]>;
  
  // CTA settings
  getCtaSettings(language?: string): Promise<any[]>;
  
  // SEO settings
  getSeoSettings(page?: string, language?: string): Promise<any[]>;
}

export class HybridStorage implements HybridStorageInterface {
  private dataPath: string;

  constructor() {
    this.dataPath = join(process.cwd(), 'server/data');
    console.log("✅ Hybrid storage initialized with JSON fallback system");
  }

  private loadJsonFile(filename: string): any[] {
    try {
      const filePath = join(this.dataPath, filename);
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.warn(`⚠️ Could not load ${filename}:`, error);
      return [];
    }
  }

  private saveJsonFile(filename: string, data: any[]): void {
    try {
      const filePath = join(this.dataPath, filename);
      writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`❌ Could not save ${filename}:`, error);
    }
  }

  // Hero videos operations
  async getHeroVideos(): Promise<any[]> {
    const data = this.loadJsonFile('hero-videos.json');
    return data; // Return all videos for admin management
  }

  async updateHeroVideoOrder(videoId: number, newOrder: number): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    const targetVideo = videos[videoIndex];
    const oldOrder = targetVideo.order_index;
    
    // Update other videos' order indices to make room
    videos.forEach((video: any) => {
      if (video.id === videoId) return; // Skip the target video
      
      if (newOrder < oldOrder) {
        // Moving up: increment order of videos in between
        if (video.order_index >= newOrder && video.order_index < oldOrder) {
          video.order_index += 1;
        }
      } else if (newOrder > oldOrder) {
        // Moving down: decrement order of videos in between
        if (video.order_index > oldOrder && video.order_index <= newOrder) {
          video.order_index -= 1;
        }
      }
    });
    
    // Update target video's order
    targetVideo.order_index = newOrder;
    targetVideo.updated_at = new Date().toISOString();
    
    this.saveJsonFile('hero-videos.json', videos);
    
    return targetVideo;
  }

  async updateHeroVideoStatus(videoId: number, isActive: boolean): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    videos[videoIndex].is_active = isActive;
    this.saveJsonFile('hero-videos.json', videos);
    
    return videos[videoIndex];
  }

  async updateHeroVideo(videoId: number, updates: any): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    videos[videoIndex] = { ...videos[videoIndex], ...updates };
    this.saveJsonFile('hero-videos.json', videos);
    
    return videos[videoIndex];
  }

  async addHeroVideo(video: any): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const newVideo = {
      id: Date.now(), // Simple ID generation
      ...video,
      created_at: new Date().toISOString()
    };
    videos.push(newVideo);
    this.saveJsonFile('hero-videos.json', videos);
    return newVideo;
  }

  async deleteHeroVideo(videoId: number): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    const deletedVideo = videos[videoIndex];
    videos.splice(videoIndex, 1);
    this.saveJsonFile('hero-videos.json', videos);
    
    return deletedVideo;
  }

  // Hero text settings operations
  async getHeroTextSettings(language?: string): Promise<any[]> {
    const data = this.loadJsonFile('hero-text.json');
    return data; // Return all texts for admin management
  }

  async createHeroText(text: any): Promise<any> {
    const texts = this.loadJsonFile('hero-text.json');
    const newText = {
      id: Date.now(), // Simple ID generation
      ...text,
      created_at: new Date().toISOString()
    };
    texts.push(newText);
    this.saveJsonFile('hero-text.json', texts);
    return newText;
  }

  async updateHeroText(textId: number, updateData: any): Promise<any> {
    const texts = this.loadJsonFile('hero-text.json');
    const textIndex = texts.findIndex((t: any) => t.id === textId);
    
    if (textIndex === -1) {
      throw new Error('Hero text not found');
    }
    
    const updatedText = { ...texts[textIndex], ...updateData };
    texts[textIndex] = updatedText;
    this.saveJsonFile('hero-text.json', texts);
    
    return updatedText;
  }

  async deactivateAllHeroTexts(): Promise<void> {
    const texts = this.loadJsonFile('hero-text.json');
    const updatedTexts = texts.map((text: any) => ({ ...text, is_active: false }));
    this.saveJsonFile('hero-text.json', updatedTexts);
  }

  async deleteHeroText(textId: number): Promise<any> {
    const texts = this.loadJsonFile('hero-text.json');
    const textIndex = texts.findIndex((t: any) => t.id === textId);
    
    if (textIndex === -1) {
      throw new Error('Hero text not found');
    }
    
    const deletedText = texts[textIndex];
    texts.splice(textIndex, 1);
    this.saveJsonFile('hero-text.json', texts);
    
    return deletedText;
  }

  // Gallery operations
  async getGalleryItems(): Promise<any[]> {
    const data = this.loadJsonFile('gallery-items.json');
    return data; // Return all items for admin management
  }

  async createGalleryItem(item: any): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const newItem = {
      id: Date.now(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    items.push(newItem);
    this.saveJsonFile('gallery-items.json', items);
    return newItem;
  }

  async updateGalleryItem(itemId: number, updateData: any): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const itemIndex = items.findIndex((item: any) => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Gallery item not found');
    }
    
    const updatedItem = { 
      ...items[itemIndex], 
      ...updateData, 
      updated_at: new Date().toISOString() 
    };
    items[itemIndex] = updatedItem;
    this.saveJsonFile('gallery-items.json', items);
    
    return updatedItem;
  }

  async updateGalleryItemOrder(itemId: number, newOrder: number): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const itemIndex = items.findIndex((item: any) => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Gallery item not found');
    }
    
    const item = items[itemIndex];
    const oldOrder = item.order_index;
    
    // Update order indexes for other items
    items.forEach((otherItem: any) => {
      if (otherItem.id !== itemId) {
        if (newOrder > oldOrder) {
          // Moving down - shift others up
          if (otherItem.order_index > oldOrder && otherItem.order_index <= newOrder) {
            otherItem.order_index--;
          }
        } else {
          // Moving up - shift others down  
          if (otherItem.order_index >= newOrder && otherItem.order_index < oldOrder) {
            otherItem.order_index++;
          }
        }
      }
    });
    
    // Update the target item's order
    item.order_index = newOrder;
    item.updated_at = new Date().toISOString();
    
    this.saveJsonFile('gallery-items.json', items);
    return item;
  }

  async deleteGalleryItem(itemId: number): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const itemIndex = items.findIndex((item: any) => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Gallery item not found');
    }
    
    const deletedItem = items[itemIndex];
    items.splice(itemIndex, 1);
    this.saveJsonFile('gallery-items.json', items);
    
    return deletedItem;
  }

  // FAQ operations
  async getFaqSections(language?: string): Promise<any[]> {
    const data = this.loadJsonFile('faq-sections.json');
    return data.filter(section => section.is_active);
  }

  async getFaqs(sectionId?: string): Promise<any[]> {
    const data = this.loadJsonFile('faqs.json');
    const activeFaqs = data.filter(faq => faq.is_active);
    return sectionId ? activeFaqs.filter(f => f.section_id === sectionId) : activeFaqs;
  }

  // Contact operations
  async getContacts(): Promise<any[]> {
    return this.loadJsonFile('contacts.json');
  }

  async createContact(contact: any): Promise<any> {
    const contacts = this.loadJsonFile('contacts.json');
    const newContact = {
      id: Date.now(), // Simple ID generation
      ...contact,
      created_at: new Date().toISOString(),
      status: 'new'
    };
    contacts.push(newContact);
    this.saveJsonFile('contacts.json', contacts);
    return newContact;
  }

  // Legal documents operations
  async getLegalDocuments(language?: string): Promise<any[]> {
    const data = this.loadJsonFile('legal-documents.json');
    return data.filter(doc => doc.is_active);
  }

  // CTA settings operations
  async getCtaSettings(language?: string): Promise<any[]> {
    const data = this.loadJsonFile('cta-settings.json');
    return data.filter(setting => setting.is_active);
  }

  // SEO settings operations
  async getSeoSettings(page?: string, language?: string): Promise<any[]> {
    const data = this.loadJsonFile('seo-settings.json');
    return page ? data.filter(s => s.page === page) : data;
  }
}

// Create singleton instance
export const hybridStorage = new HybridStorage();