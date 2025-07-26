import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { createClient } from '@supabase/supabase-js';

export interface HybridStorageInterface {
  // Hero videos
  getHeroVideos(): Promise<any[]>;
  createHeroVideo(videoData: any): Promise<any>;
  updateHeroVideo(videoId: number, updates: any): Promise<any>;
  deleteHeroVideo(videoId: number): Promise<any>;
  
  // Hero text settings  
  getHeroTextSettings(language?: string): Promise<any[]>;
  
  // Gallery items
  getGalleryItems(): Promise<any[]>;
  
  // FAQ sections and FAQs
  getFaqSections(language?: string): Promise<any[]>;
  getFaqs(sectionId?: string): Promise<any[]>;
  
  // FAQ section CRUD operations
  createFAQSection(sectionData: any): Promise<any>;
  updateFAQSection(sectionId: string | number, updates: any): Promise<any>;
  deleteFAQSection(sectionId: string | number): Promise<void>;
  
  // FAQ CRUD operations  
  createFAQ(faqData: any): Promise<any>;
  updateFAQ(faqId: number, updates: any): Promise<any>;
  deleteFAQ(faqId: number): Promise<void>;
  
  // Contacts
  getContacts(): Promise<any[]>;
  createContact(contact: any): Promise<any>;
  
  // Legal documents
  getLegalDocuments(language?: string): Promise<any[]>;
  
  // CTA settings
  getCtaSettings(language?: string): Promise<any[]>;
  
  // SEO settings
  getSeoSettings(page?: string, language?: string): Promise<any[]>;
  
  // Analytics methods
  getAnalyticsSessions(dateFrom?: string, dateTo?: string, language?: string): Promise<any[]>;
  getAnalyticsViews(dateFrom?: string, dateTo?: string, videoId?: string): Promise<any[]>;
  getAnalyticsSettings(): Promise<any>;
  createAnalyticsSession(sessionData: any): Promise<any>;
  createAnalyticsView(viewData: any): Promise<any>;
  updateAnalyticsSettings(settings: any): Promise<any>;
  resetAnalyticsData(): Promise<void>;
  getAnalyticsDashboard(dateFrom?: string, dateTo?: string): Promise<any>;
  
  // IP Management methods
  getActiveViewerIps(): Promise<any[]>;
  addExcludedIp(ipAddress: string): Promise<any>;
  removeExcludedIp(ipAddress: string): Promise<any>;

  // Real-time Analytics methods
  getRealtimeVisitors(): Promise<any[]>;
  updateVisitorActivity(sessionId: string, currentPage: string): Promise<any>;
  deactivateVisitor(sessionId: string): Promise<void>;
  createRealtimeVisitor(visitorData: any): Promise<any>;

  // Performance Monitoring methods
  recordPerformanceMetric(metricData: any): Promise<any>;
  getPerformanceMetrics(metricType?: string, timeRange?: { from: string; to: string }): Promise<any[]>;
  getSystemHealth(): Promise<any>;

  // Engagement Heatmap methods
  recordEngagementEvent(eventData: any): Promise<any>;
  getEngagementHeatmap(pageUrl: string, timeRange?: { from: string; to: string }): Promise<any[]>;

  // Conversion Funnel methods
  recordConversionStep(stepData: any): Promise<any>;
  getConversionFunnel(timeRange?: { from: string; to: string }): Promise<any>;
  getFunnelAnalytics(timeRange?: { from: string; to: string }): Promise<any>;
}

export class HybridStorage implements HybridStorageInterface {
  private dataPath: string;
  private supabase: any;

  constructor() {
    this.dataPath = join(process.cwd(), 'server/data');
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    console.log("✅ Hybrid storage initialized with JSON fallback system and Supabase integration");
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

  async createHeroVideo(videoData: any): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    
    // Get next ID
    const nextId = videos.length > 0 ? Math.max(...videos.map(v => v.id)) + 1 : 1;
    
    const newVideo = {
      id: nextId,
      title_en: videoData.title_en,
      title_fr: videoData.title_fr,
      url_en: videoData.url_en,
      url_fr: videoData.url_fr || videoData.url_en,
      use_same_video: videoData.use_same_video || true,
      is_active: videoData.is_active || false,
      order_index: videoData.order_index || videos.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    videos.push(newVideo);
    this.saveJsonFile('hero-videos.json', videos);
    
    return newVideo;
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
    
    // Clean up video files before removing from JSON
    await this.cleanupVideoFiles(deletedVideo, 'hero');
    
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

  async getGalleryItemById(itemId: string | number): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const item = items.find((item: any) => item.id.toString() === itemId.toString());
    return item;
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

  async updateGalleryItem(itemId: string | number, updateData: any): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    
    console.log(`🔍 HYBRID STORAGE DEBUG - updateGalleryItem:`);
    console.log(`   - Looking for item ID: ${itemId} (type: ${typeof itemId})`);
    console.log(`   - Items in database: ${items.length}`);
    console.log(`   - All item IDs:`, items.map((item: any) => ({ id: item.id, type: typeof item.id })));
    
    const itemIndex = items.findIndex((item: any) => {
      const match = item.id.toString() === itemId.toString();
      console.log(`   - Comparing ${item.id} (${typeof item.id}) === ${itemId} (${typeof itemId}) → ${match}`);
      return match;
    });
    
    console.log(`   - Item index found: ${itemIndex}`);
    
    if (itemIndex === -1) {
      throw new Error(`Gallery item not found: ${itemId}`);
    }
    
    const updatedItem = { 
      ...items[itemIndex], 
      ...updateData, 
      updated_at: new Date().toISOString() 
    };
    items[itemIndex] = updatedItem;
    
    console.log(`   - Updated item:`, updatedItem);
    console.log(`   - Saving to JSON file...`);
    
    this.saveJsonFile('gallery-items.json', items);
    
    console.log(`   - JSON file saved successfully`);
    
    return updatedItem;
  }

  async updateGalleryItemOrder(itemId: string | number, newOrder: number): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
    
    if (itemIndex === -1) {
      throw new Error('Gallery item not found');
    }
    
    const item = items[itemIndex];
    const oldOrder = item.order_index;
    
    // Update order indexes for other items
    items.forEach((otherItem: any) => {
      if (otherItem.id.toString() !== itemId.toString()) {
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

  async deleteGalleryItem(itemId: string | number): Promise<any> {
    const items = this.loadJsonFile('gallery-items.json');
    const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
    
    if (itemIndex === -1) {
      throw new Error('Gallery item not found');
    }
    
    const deletedItem = items[itemIndex];
    
    // Clean up media files before removing from JSON
    await this.cleanupVideoFiles(deletedItem, 'gallery');
    
    items.splice(itemIndex, 1);
    this.saveJsonFile('gallery-items.json', items);
    
    return deletedItem;
  }

  // FAQ operations - TRUE HYBRID STORAGE
  async getFaqSections(language?: string): Promise<any[]> {
    try {
      console.log('🔍 FAQ Sections: Fetching from Supabase database...');
      const { data, error } = await this.supabase
        .from('faq_sections')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (!error && data) {
        console.log(`✅ FAQ Sections: Found ${data.length} sections in Supabase`);
        // Convert database format to JSON format for compatibility
        const converted = data.map((section: any) => ({
          id: parseInt(section.id) || section.id,
          title_en: section.name_en,
          title_fr: section.name_fr,
          order_index: section.order_index,
          is_active: section.is_active
        }));
        
        // Save to JSON as backup
        this.saveJsonFile('faq-sections.json', converted);
        return converted;
      } else {
        console.warn('⚠️ FAQ Sections: Supabase error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Sections: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('faq-sections.json');
    return data.filter(section => section.is_active);
  }

  async getFaqs(sectionId?: string): Promise<any[]> {
    try {
      console.log('🔍 FAQs: Fetching from Supabase database...');
      let query = this.supabase
        .from('faqs')
        .select('*')
        .order('order_index');
      
      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        console.log(`✅ FAQs: Found ${data.length} FAQs in Supabase`);
        // Convert database format to JSON format for compatibility
        const converted = data.map((faq: any) => ({
          id: faq.id,
          section_id: faq.section_id,
          question_en: faq.question_en,
          question_fr: faq.question_fr,
          answer_en: faq.answer_en,
          answer_fr: faq.answer_fr,
          order_index: faq.order_index,
          is_active: faq.is_active
        }));
        
        // Save to JSON as backup
        this.saveJsonFile('faqs.json', converted);
        return converted;
      } else {
        console.warn('⚠️ FAQs: Supabase error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQs: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('faqs.json');
    return sectionId ? data.filter(f => f.section_id === sectionId) : data;
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

  async updateContactStatus(contactId: string, status: string): Promise<any> {
    const contacts = this.loadJsonFile('contacts.json');
    const contactIndex = contacts.findIndex((c: any) => c.id.toString() === contactId);
    
    if (contactIndex === -1) {
      throw new Error('Contact not found');
    }
    
    contacts[contactIndex].status = status;
    contacts[contactIndex].updated_at = new Date().toISOString();
    
    this.saveJsonFile('contacts.json', contacts);
    return contacts[contactIndex];
  }

  async deleteContact(contactId: string): Promise<any> {
    const contacts = this.loadJsonFile('contacts.json');
    const contactIndex = contacts.findIndex((c: any) => c.id.toString() === contactId);
    
    if (contactIndex === -1) {
      throw new Error('Contact not found');
    }
    
    const deletedContact = contacts.splice(contactIndex, 1)[0];
    this.saveJsonFile('contacts.json', contacts);
    return deletedContact;
  }

  // Legal documents operations
  async getLegalDocuments(language?: string): Promise<any[]> {
    // Try Supabase first
    try {
      const { data, error } = await this.supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .order('type');
      
      if (!error && data) {
        console.log(`✅ Legal Documents: Found ${data.length} documents in Supabase`);
        // Convert database format to JSON format for compatibility
        const converted = data.map((doc: any) => ({
          id: doc.id,
          type: doc.type,
          title_en: doc.title_en,
          title_fr: doc.title_fr,
          content_en: doc.content_en,
          content_fr: doc.content_fr,
          is_active: doc.is_active,
          updated_at: doc.updated_at
        }));
        
        // Save to JSON as backup
        this.saveJsonFile('legal-documents.json', converted);
        return converted;
      } else {
        console.warn('⚠️ Legal Documents: Supabase error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Documents: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('legal-documents.json');
    return data.filter(doc => doc.is_active);
  }

  async createLegalDocument(document: any): Promise<any> {
    // Try Supabase first
    try {
      const docData = {
        type: document.type,
        title_en: document.title_en,
        title_fr: document.title_fr,
        content_en: document.content_en,
        content_fr: document.content_fr,
        is_active: document.is_active ?? true
      };

      const { data, error } = await this.supabase
        .from('legal_documents')
        .insert([docData])
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Legal Document created in Supabase:`, data.type);
        
        // Update JSON backup
        const docs = this.loadJsonFile('legal-documents.json');
        const newDoc = {
          id: data.id,
          type: data.type,
          title_en: data.title_en,
          title_fr: data.title_fr,
          content_en: data.content_en,
          content_fr: data.content_fr,
          is_active: data.is_active,
          updated_at: data.updated_at
        };
        docs.push(newDoc);
        this.saveJsonFile('legal-documents.json', docs);
        
        return newDoc;
      } else {
        console.warn('⚠️ Legal Document: Supabase create error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Document: Database connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    const docs = this.loadJsonFile('legal-documents.json');
    const newDoc = {
      id: crypto.randomUUID(),
      ...document,
      updated_at: new Date().toISOString(),
      is_active: document.is_active ?? true
    };
    docs.push(newDoc);
    this.saveJsonFile('legal-documents.json', docs);
    return newDoc;
  }

  async updateLegalDocument(docId: string, updates: any): Promise<any> {
    // Try Supabase first
    try {
      const { data, error } = await this.supabase
        .from('legal_documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId)
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Legal Document updated in Supabase:`, docId);
        
        // Update JSON backup
        const docs = this.loadJsonFile('legal-documents.json');
        const docIndex = docs.findIndex((d: any) => d.id === docId);
        if (docIndex !== -1) {
          docs[docIndex] = {
            ...docs[docIndex],
            ...updates,
            updated_at: data.updated_at
          };
          this.saveJsonFile('legal-documents.json', docs);
        }
        
        return data;
      } else {
        console.warn('⚠️ Legal Document: Supabase update error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Document: Database connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    const docs = this.loadJsonFile('legal-documents.json');
    const docIndex = docs.findIndex((d: any) => d.id === docId);
    
    if (docIndex === -1) {
      throw new Error('Legal document not found');
    }
    
    docs[docIndex] = {
      ...docs[docIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.saveJsonFile('legal-documents.json', docs);
    return docs[docIndex];
  }

  async deleteLegalDocument(docId: string): Promise<any> {
    // Try Supabase first
    try {
      const { data, error } = await this.supabase
        .from('legal_documents')
        .delete()
        .eq('id', docId)
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Legal Document deleted from Supabase:`, docId);
        
        // Update JSON backup
        const docs = this.loadJsonFile('legal-documents.json');
        const filteredDocs = docs.filter((d: any) => d.id !== docId);
        this.saveJsonFile('legal-documents.json', filteredDocs);
        
        return data;
      } else {
        console.warn('⚠️ Legal Document: Supabase delete error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Document: Database connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    const docs = this.loadJsonFile('legal-documents.json');
    const docIndex = docs.findIndex((d: any) => d.id === docId);
    
    if (docIndex === -1) {
      throw new Error('Legal document not found');
    }
    
    const deletedDoc = docs.splice(docIndex, 1)[0];
    this.saveJsonFile('legal-documents.json', docs);
    return deletedDoc;
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

  /**
   * Clean up video files from Supabase storage and local cache
   * Works for both hero videos and gallery items
   */
  private async cleanupVideoFiles(item: any, type: 'hero' | 'gallery'): Promise<void> {
    try {
      console.log(`🗑️ Starting file cleanup for ${type} item:`, item.id);
      
      const filesToDelete: string[] = [];
      
      if (type === 'hero') {
        // Hero videos can have separate English/French files
        if (item.url_en) filesToDelete.push(item.url_en);
        if (item.url_fr && item.url_fr !== item.url_en) {
          filesToDelete.push(item.url_fr);
        }
      } else if (type === 'gallery') {
        // Gallery items can have video and/or image
        if (item.video_url) filesToDelete.push(item.video_url);
        if (item.image_url) filesToDelete.push(item.image_url);
      }

      // Remove files from Supabase storage
      for (const filename of filesToDelete) {
        if (filename) {
          await this.deleteFromSupabaseStorage(filename, type);
          await this.deleteFromLocalCache(filename);
        }
      }

      console.log(`✅ File cleanup completed for ${type} item ${item.id}`);
    } catch (error) {
      console.error(`❌ Error during file cleanup for ${type} item ${item.id}:`, error);
      // Don't throw here - we still want to delete the metadata even if file cleanup fails
    }
  }

  /**
   * Delete file from Supabase storage bucket
   */
  private async deleteFromSupabaseStorage(filename: string, type: 'hero' | 'gallery'): Promise<void> {
    try {
      const bucketName = type === 'hero' ? 'memopyk-hero' : 'memopyk-gallery';
      
      console.log(`🗑️ Deleting ${filename} from Supabase bucket: ${bucketName}`);
      
      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove([filename]);

      if (error) {
        console.error(`❌ Supabase deletion error for ${filename}:`, error);
      } else {
        console.log(`✅ Successfully deleted ${filename} from Supabase storage`);
      }
    } catch (error) {
      console.error(`❌ Exception during Supabase deletion of ${filename}:`, error);
    }
  }

  /**
   * Delete file from local video cache
   */
  private async deleteFromLocalCache(filename: string): Promise<void> {
    try {
      const cacheDir = join(process.cwd(), 'server/cache/videos');
      
      // Generate the same hash-based filename used by video-cache.ts
      const { createHash } = require('crypto');
      const hash = createHash('md5').update(filename).digest('hex');
      const extension = filename.split('.').pop() || 'mp4';
      const cacheFilePath = join(cacheDir, `${hash}.${extension}`);

      if (existsSync(cacheFilePath)) {
        unlinkSync(cacheFilePath);
        console.log(`✅ Successfully deleted cached file: ${filename}`);
      } else {
        console.log(`ℹ️ Cache file not found (already cleaned): ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting cached file ${filename}:`, error);
    }
  }



  async createFAQSection(sectionData: any): Promise<any> {
    try {
      console.log('🆕 Creating FAQ Section in Supabase:', sectionData);
      const { data, error } = await this.supabase
        .from('faq_sections')
        .insert({
          id: `section_${Date.now()}`, // Generate unique string ID
          key: `section_${Date.now()}`,
          name_en: sectionData.title_en,
          name_fr: sectionData.title_fr,
          order_index: sectionData.order_index || 0,
          is_active: true
        })
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ Section created in Supabase:', data);
        
        // Convert for JSON compatibility and save backup
        const converted = {
          id: parseInt(data.id.replace('section_', '')) || data.id,
          title_en: data.name_en,
          title_fr: data.name_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup
        const sections = this.loadJsonFile('faq-sections.json');
        sections.push(converted);
        this.saveJsonFile('faq-sections.json', sections);
        
        return converted;
      } else {
        console.warn('⚠️ FAQ Section: Supabase create error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Section: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const sections = this.loadJsonFile('faq-sections.json');
    const maxId = sections.length > 0 ? Math.max(...sections.map((s: any) => s.id)) : 0;
    const newSection = {
      id: maxId + 1,
      ...sectionData
    };
    sections.push(newSection);
    this.saveJsonFile('faq-sections.json', sections);
    return newSection;
  }

  async updateFAQSection(sectionId: string | number, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating FAQ Section in Supabase:', sectionId, updates);
      
      // Convert JSON format to database format
      const dbUpdates: any = {};
      if (updates.title_en) dbUpdates.name_en = updates.title_en;
      if (updates.title_fr) dbUpdates.name_fr = updates.title_fr;
      if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      
      const { data, error } = await this.supabase
        .from('faq_sections')
        .update(dbUpdates)
        .eq('id', typeof sectionId === 'string' ? sectionId : `section_${sectionId}`)
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ Section updated in Supabase:', data);
        
        // Convert back and update JSON backup
        const converted = {
          id: parseInt(data.id.replace('section_', '')) || data.id,
          title_en: data.name_en,
          title_fr: data.name_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup with the same order swapping logic
        const sections = this.loadJsonFile('faq-sections.json');
        const index = sections.findIndex((section: any) => section.id === sectionId);
        if (index !== -1) {
          if (updates.order_index !== undefined) {
            const currentSection = sections[index];
            const targetOrderIndex = updates.order_index;
            const currentOrderIndex = currentSection.order_index;
            
            const targetSection = sections.find((section: any) => section.order_index === targetOrderIndex);
            
            if (targetSection && targetSection.id !== sectionId) {
              console.log(`🔄 Swapping FAQ section orders: ${sectionId} (${currentOrderIndex}) ↔ ${targetSection.id} (${targetOrderIndex})`);
              targetSection.order_index = currentOrderIndex;
            }
            
            currentSection.order_index = targetOrderIndex;
            Object.assign(currentSection, updates);
          } else {
            sections[index] = { ...sections[index], ...updates };
          }
          
          this.saveJsonFile('faq-sections.json', sections);
        }
        
        return converted;
      } else {
        console.warn('⚠️ FAQ Section: Supabase update error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Section: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const sections = this.loadJsonFile('faq-sections.json');
    const index = sections.findIndex((section: any) => section.id === sectionId);
    if (index === -1) throw new Error('FAQ section not found');
    
    // Implement same order swapping logic for fallback
    if (updates.order_index !== undefined) {
      const currentSection = sections[index];
      const targetOrderIndex = updates.order_index;
      const currentOrderIndex = currentSection.order_index;
      
      const targetSection = sections.find((section: any) => section.order_index === targetOrderIndex);
      
      if (targetSection && targetSection.id !== sectionId) {
        console.log(`🔄 Swapping FAQ section orders: ${sectionId} (${currentOrderIndex}) ↔ ${targetSection.id} (${targetOrderIndex})`);
        targetSection.order_index = currentOrderIndex;
      }
      
      currentSection.order_index = targetOrderIndex;
      Object.assign(currentSection, updates);
    } else {
      sections[index] = { ...sections[index], ...updates };
    }
    
    this.saveJsonFile('faq-sections.json', sections);
    return sections[index];
  }

  async deleteFAQSection(sectionId: string | number): Promise<void> {
    try {
      console.log('🗑️ Deleting FAQ Section from Supabase:', sectionId);
      const { error } = await this.supabase
        .from('faq_sections')
        .delete()
        .eq('id', typeof sectionId === 'string' ? sectionId : `section_${sectionId}`);
      
      if (!error) {
        console.log('✅ FAQ Section deleted from Supabase');
      } else {
        console.warn('⚠️ FAQ Section: Supabase delete error, continuing with JSON cleanup:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Section: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup regardless
    const sections = this.loadJsonFile('faq-sections.json');
    const filtered = sections.filter((section: any) => section.id !== sectionId);
    this.saveJsonFile('faq-sections.json', filtered);
  }



  async createFAQ(faqData: any): Promise<any> {
    try {
      console.log('🆕 Creating FAQ in Supabase:', faqData);
      const { data, error } = await this.supabase
        .from('faqs')
        .insert({
          section_name_en: '', // Not used in current interface but required by schema
          section_name_fr: '', // Not used in current interface but required by schema
          section_order: 0,
          section_id: faqData.section_id?.toString() || '0',
          question_en: faqData.question_en,
          question_fr: faqData.question_fr,
          answer_en: faqData.answer_en,
          answer_fr: faqData.answer_fr,
          order_index: faqData.order_index || 0,
          is_active: faqData.is_active !== false
        })
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ created in Supabase:', data);
        
        // Convert for JSON compatibility and save backup
        const converted = {
          id: data.id,
          section_id: data.section_id,
          question_en: data.question_en,
          question_fr: data.question_fr,
          answer_en: data.answer_en,
          answer_fr: data.answer_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup
        const faqs = this.loadJsonFile('faqs.json');
        faqs.push(converted);
        this.saveJsonFile('faqs.json', faqs);
        
        return converted;
      } else {
        console.warn('⚠️ FAQ: Supabase create error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const faqs = this.loadJsonFile('faqs.json');
    const maxId = faqs.length > 0 ? Math.max(...faqs.map((f: any) => f.id)) : 0;
    const newFAQ = {
      id: maxId + 1,
      ...faqData
    };
    faqs.push(newFAQ);
    this.saveJsonFile('faqs.json', faqs);
    return newFAQ;
  }

  async updateFAQ(faqId: string | number, updates: any): Promise<any> {
    try {
      console.log('🔄 ===== FAQ UPDATE START =====');
      console.log('🔄 Updating FAQ in Supabase:', faqId, updates);
      console.log('🔄 FAQ ID type:', typeof faqId);
      console.log('🔄 Updates object:', JSON.stringify(updates, null, 2));
      
      // Convert JSON format to database format if needed
      const dbUpdates: any = {};
      if (updates.question_en) dbUpdates.question_en = updates.question_en;
      if (updates.question_fr) dbUpdates.question_fr = updates.question_fr;
      if (updates.answer_en) dbUpdates.answer_en = updates.answer_en;
      if (updates.answer_fr) dbUpdates.answer_fr = updates.answer_fr;
      if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.section_id !== undefined) dbUpdates.section_id = updates.section_id.toString();
      
      console.log('🔄 Database updates to apply:', JSON.stringify(dbUpdates, null, 2));
      
      const { data, error } = await this.supabase
        .from('faqs')
        .update(dbUpdates)
        .eq('id', faqId)
        .select()
        .single();
      
      console.log('🔄 Supabase response - Data:', data);
      console.log('🔄 Supabase response - Error:', error);
      
      if (!error && data) {
        console.log('✅ FAQ updated in Supabase successfully!');
        console.log('✅ Updated FAQ data:', JSON.stringify(data, null, 2));
        
        // Convert back for JSON format
        const converted = {
          id: data.id,
          section_id: data.section_id,
          question_en: data.question_en,
          question_fr: data.question_fr,
          answer_en: data.answer_en,
          answer_fr: data.answer_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        console.log('✅ Converted FAQ for return:', JSON.stringify(converted, null, 2));
        
        // Update JSON backup with same order swapping logic
        const faqs = this.loadJsonFile('faqs.json');
        const index = faqs.findIndex((faq: any) => faq.id === faqId);
        console.log('✅ JSON backup - FAQ index found:', index, 'out of', faqs.length, 'FAQs');
        
        if (index !== -1) {
          if (updates.order_index !== undefined) {
            const currentFaq = faqs[index];
            const targetOrderIndex = updates.order_index;
            const currentOrderIndex = currentFaq.order_index;
            const sectionId = currentFaq.section_id;
            
            const targetFaq = faqs.find((faq: any) => 
              faq.section_id === sectionId && 
              faq.order_index === targetOrderIndex &&
              faq.id !== faqId
            );
            
            if (targetFaq) {
              console.log(`🔄 Swapping FAQ orders in section ${sectionId}: ${faqId} (${currentOrderIndex}) ↔ ${targetFaq.id} (${targetOrderIndex})`);
              targetFaq.order_index = currentOrderIndex;
            }
            
            currentFaq.order_index = targetOrderIndex;
            Object.assign(currentFaq, updates);
          } else {
            console.log('✅ Updating FAQ in JSON backup - simple update');
            faqs[index] = { ...faqs[index], ...updates };
          }
          
          this.saveJsonFile('faqs.json', faqs);
          console.log('✅ JSON backup updated successfully');
        } else {
          console.log('⚠️ FAQ not found in JSON backup for ID:', faqId);
        }
        
        console.log('✅ ===== FAQ UPDATE COMPLETE - SUCCESS =====');
        return converted;
      } else {
        console.warn('⚠️ FAQ: Supabase update error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const faqs = this.loadJsonFile('faqs.json');
    const index = faqs.findIndex((faq: any) => faq.id === faqId);
    if (index === -1) throw new Error('FAQ not found');
    
    // Same order swapping logic for fallback
    if (updates.order_index !== undefined) {
      const currentFaq = faqs[index];
      const targetOrderIndex = updates.order_index;
      const currentOrderIndex = currentFaq.order_index;
      const sectionId = currentFaq.section_id;
      
      const targetFaq = faqs.find((faq: any) => 
        faq.section_id === sectionId && 
        faq.order_index === targetOrderIndex &&
        faq.id !== faqId
      );
      
      if (targetFaq) {
        console.log(`🔄 Swapping FAQ orders in section ${sectionId}: ${faqId} (${currentOrderIndex}) ↔ ${targetFaq.id} (${targetOrderIndex})`);
        targetFaq.order_index = currentOrderIndex;
      }
      
      currentFaq.order_index = targetOrderIndex;
      Object.assign(currentFaq, updates);
    } else {
      faqs[index] = { ...faqs[index], ...updates };
    }
    
    this.saveJsonFile('faqs.json', faqs);
    return faqs[index];
  }

  async deleteFAQ(faqId: string | number): Promise<void> {
    try {
      console.log('🗑️ Deleting FAQ from Supabase:', faqId);
      const { error } = await this.supabase
        .from('faqs')
        .delete()
        .eq('id', faqId);
      
      if (!error) {
        console.log('✅ FAQ deleted from Supabase');
      } else {
        console.warn('⚠️ FAQ: Supabase delete error, continuing with JSON cleanup:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup regardless
    const faqs = this.loadJsonFile('faqs.json');
    const filtered = faqs.filter((faq: any) => faq.id !== faqId);
    this.saveJsonFile('faqs.json', filtered);
  }

  // Analytics methods implementation
  async getAnalyticsSessions(dateFrom?: string, dateTo?: string, language?: string): Promise<any[]> {
    try {
      // Try database first (not implemented yet), fallback to JSON
      const sessions = this.loadJsonFile('analytics-sessions.json');
      let filtered = sessions;

      if (dateFrom) {
        filtered = filtered.filter((session: any) => session.created_at >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter((session: any) => session.created_at <= dateTo);
      }
      if (language) {
        filtered = filtered.filter((session: any) => session.language === language);
      }

      return filtered;
    } catch (error) {
      console.error('Error getting analytics sessions:', error);
      return [];
    }
  }

  async getAnalyticsViews(dateFrom?: string, dateTo?: string, videoId?: string): Promise<any[]> {
    try {
      // Try database first (not implemented yet), fallback to JSON
      const views = this.loadJsonFile('analytics-views.json');
      let filtered = views;

      if (dateFrom) {
        filtered = filtered.filter((view: any) => view.created_at >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter((view: any) => view.created_at <= dateTo);
      }
      if (videoId) {
        filtered = filtered.filter((view: any) => view.video_id === videoId);
      }

      return filtered;
    } catch (error) {
      console.error('Error getting analytics views:', error);
      return [];
    }
  }

  async getAnalyticsSettings(): Promise<any> {
    try {
      const settings = this.loadJsonFile('analytics-settings.json');
      return Array.isArray(settings) ? settings[0] || {} : settings;
    } catch (error) {
      console.error('Error getting analytics settings:', error);
      return {
        excludedIps: ["127.0.0.1", "::1"],
        completionThreshold: 80,
        trackingEnabled: true,
        dataRetentionDays: 90
      };
    }
  }

  async createAnalyticsSession(sessionData: any): Promise<any> {
    try {
      const sessions = this.loadJsonFile('analytics-sessions.json');
      
      // Generate IP location data (simplified)
      const sessionWithId = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        session_id: sessionData.session_id || `session_${Date.now()}`,
        country: sessionData.country || 'Unknown',
        region: sessionData.region || 'Unknown', 
        city: sessionData.city || 'Unknown',
        language: sessionData.language || 'en-US',
        user_agent: sessionData.user_agent || '',
        screen_resolution: sessionData.screen_resolution || '',
        page_url: sessionData.page_url || '',
        referrer: sessionData.referrer || '',
        ip_address: sessionData.ip_address || '0.0.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      sessions.push(sessionWithId);
      this.saveJsonFile('analytics-sessions.json', sessions);
      
      return sessionWithId;
    } catch (error) {
      console.error('Error creating analytics session:', error);
      throw error;
    }
  }

  async createAnalyticsView(viewData: any): Promise<any> {
    try {
      const views = this.loadJsonFile('analytics-views.json');
      
      const viewWithId = {
        id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        video_id: viewData.video_id,
        video_type: viewData.video_type || 'gallery', // Focus on gallery videos
        video_title: viewData.video_title || '',
        session_id: viewData.session_id,
        language: viewData.language || 'en-US',
        watch_time: viewData.watch_time || 0,
        completion_rate: viewData.completion_rate || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      views.push(viewWithId);
      this.saveJsonFile('analytics-views.json', views);
      
      return viewWithId;
    } catch (error) {
      console.error('Error creating analytics view:', error);
      throw error;
    }
  }

  async updateAnalyticsSettings(settings: any): Promise<any> {
    try {
      const currentSettings = await this.getAnalyticsSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updated_at: new Date().toISOString()
      };

      this.saveJsonFile('analytics-settings.json', updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating analytics settings:', error);
      throw error;
    }
  }



  async resetAnalyticsData(): Promise<void> {
    try {
      this.saveJsonFile('analytics-sessions.json', []);
      this.saveJsonFile('analytics-views.json', []);
      console.log('✅ Analytics data reset successfully');
    } catch (error) {
      console.error('Error resetting analytics data:', error);
      throw error;
    }
  }

  async getAnalyticsDashboard(dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      const sessions = await this.getAnalyticsSessions(dateFrom, dateTo);
      const views = await this.getAnalyticsViews(dateFrom, dateTo);
      
      // Calculate overview metrics
      const totalViews = views.length;
      const uniqueVisitors = new Set(sessions.map((s: any) => s.ip_address)).size;
      const totalWatchTime = views.reduce((sum: number, view: any) => sum + (view.watch_time || 0), 0);
      const averageSessionDuration = sessions.length > 0 
        ? sessions.reduce((sum: number, session: any) => sum + (session.duration || 0), 0) / sessions.length
        : 0;

      // Top countries
      const countryMap = new Map();
      sessions.forEach((session: any) => {
        const country = session.country || 'Unknown';
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });
      const topCountries = Array.from(countryMap.entries())
        .map(([country, views]) => ({ country, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      // Language breakdown
      const languageMap = new Map();
      sessions.forEach((session: any) => {
        const language = session.language || 'Unknown';
        languageMap.set(language, (languageMap.get(language) || 0) + 1);
      });
      const languageBreakdown = Array.from(languageMap.entries())
        .map(([language, views]) => ({ language, views }))
        .sort((a, b) => b.views - a.views);

      // Video performance (Gallery videos only)
      const galleryViews = views.filter((view: any) => view.video_type === 'gallery');
      const videoMap = new Map();
      galleryViews.forEach((view: any) => {
        const videoId = view.video_id;
        if (!videoMap.has(videoId)) {
          videoMap.set(videoId, {
            video_id: videoId,
            video_title: view.video_title,
            views: 0,
            total_watch_time: 0,
            average_completion_rate: 0
          });
        }
        const video = videoMap.get(videoId);
        video.views += 1;
        video.total_watch_time += view.watch_time || 0;
        video.average_completion_rate = ((video.average_completion_rate * (video.views - 1)) + (view.completion_rate || 0)) / video.views;
      });
      
      const videoPerformance = Array.from(videoMap.values())
        .sort((a, b) => b.views - a.views);

      return {
        overview: {
          totalViews,
          uniqueVisitors,
          totalWatchTime,
          averageSessionDuration
        },
        topCountries,
        languageBreakdown,
        videoPerformance,
        dateRange: {
          from: dateFrom || 'all time',
          to: dateTo || 'now'
        }
      };
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      throw error;
    }
  }

  // IP Management Methods
  async getActiveViewerIps(): Promise<any[]> {
    try {
      // Get session data to analyze IP addresses
      const sessions = this.loadJsonFile('analytics-sessions.json');
      const ipMap = new Map();

      sessions.forEach((session: any) => {
        const ip = session.ip_address;
        if (!ip) return;

        if (ipMap.has(ip)) {
          const existing = ipMap.get(ip);
          existing.session_count++;
          existing.last_activity = session.timestamp > existing.last_activity ? session.timestamp : existing.last_activity;
        } else {
          ipMap.set(ip, {
            ip_address: ip,
            country: session.country || 'Unknown',
            city: session.city || 'Unknown',
            first_seen: session.timestamp,
            last_activity: session.timestamp,
            session_count: 1
          });
        }
      });

      return Array.from(ipMap.values()).sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );
    } catch (error) {
      console.error('Error getting active viewer IPs:', error);
      return [];
    }
  }

  async addExcludedIp(ipAddress: string): Promise<any> {
    try {
      // Get current settings
      const settings = await this.getAnalyticsSettings();
      
      // Add IP to excluded list if not already there
      if (!settings.excludedIps.includes(ipAddress)) {
        settings.excludedIps.push(ipAddress);
        await this.updateAnalyticsSettings(settings);
      }

      return settings;
    } catch (error) {
      console.error('Error adding excluded IP:', error);
      throw error;
    }
  }

  async removeExcludedIp(ipAddress: string): Promise<any> {
    try {
      // Get current settings
      const settings = await this.getAnalyticsSettings();
      
      // Remove IP from excluded list
      settings.excludedIps = settings.excludedIps.filter((ip: string) => ip !== ipAddress);
      await this.updateAnalyticsSettings(settings);

      return settings;
    } catch (error) {
      console.error('Error removing excluded IP:', error);
      throw error;
    }
  }

  // Real-time Analytics Methods
  async getRealtimeVisitors(): Promise<any[]> {
    try {
      // Try database first
      const { data: visitors } = await this.supabase
        .from('realtime_visitors')
        .select('*')
        .eq('isActive', true)
        .order('lastSeen', { ascending: false });

      if (visitors && visitors.length > 0) {
        return visitors;
      }

      // Fallback to JSON file
      const visitorData = this.loadJsonFile('realtime-visitors.json');
      return visitorData.filter((v: any) => v.isActive);
    } catch (error) {
      console.warn('Database error, using JSON fallback for realtime visitors:', error);
      const visitorData = this.loadJsonFile('realtime-visitors.json');
      return visitorData.filter((v: any) => v.isActive);
    }
  }

  async updateVisitorActivity(sessionId: string, currentPage: string): Promise<any> {
    try {
      const updateData = {
        currentPage,
        lastSeen: new Date().toISOString(),
        isActive: true
      };

      // Update in database
      const { data: updatedVisitor } = await this.supabase
        .from('realtime_visitors')
        .update(updateData)
        .eq('sessionId', sessionId)
        .select()
        .single();

      if (updatedVisitor) {
        return updatedVisitor;
      }

      // Fallback to JSON update
      const visitors = this.loadJsonFile('realtime-visitors.json');
      const visitorIndex = visitors.findIndex((v: any) => v.sessionId === sessionId);
      
      if (visitorIndex >= 0) {
        visitors[visitorIndex] = { ...visitors[visitorIndex], ...updateData };
        this.saveJsonFile('realtime-visitors.json', visitors);
        return visitors[visitorIndex];
      }

      return null;
    } catch (error) {
      console.error('Error updating visitor activity:', error);
      throw error;
    }
  }

  async deactivateVisitor(sessionId: string): Promise<void> {
    try {
      // Update in database
      await this.supabase
        .from('realtime_visitors')
        .update({ isActive: false })
        .eq('sessionId', sessionId);

      // Update JSON fallback
      const visitors = this.loadJsonFile('realtime-visitors.json');
      const visitorIndex = visitors.findIndex((v: any) => v.sessionId === sessionId);
      
      if (visitorIndex >= 0) {
        visitors[visitorIndex].isActive = false;
        this.saveJsonFile('realtime-visitors.json', visitors);
      }
    } catch (error) {
      console.error('Error deactivating visitor:', error);
    }
  }

  async createRealtimeVisitor(visitorData: any): Promise<any> {
    try {
      const newVisitor = {
        sessionId: visitorData.sessionId,
        ipAddress: visitorData.ipAddress,
        currentPage: visitorData.currentPage,
        userAgent: visitorData.userAgent,
        country: visitorData.country || null,
        city: visitorData.city || null,
        isActive: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Try database first
      const { data: createdVisitor } = await this.supabase
        .from('realtime_visitors')
        .insert(newVisitor)
        .select()
        .single();

      if (createdVisitor) {
        return createdVisitor;
      }

      // Fallback to JSON
      const visitors = this.loadJsonFile('realtime-visitors.json');
      visitors.push(newVisitor);
      this.saveJsonFile('realtime-visitors.json', visitors);
      
      return newVisitor;
    } catch (error) {
      console.error('Error creating realtime visitor:', error);
      throw error;
    }
  }

  // Performance Monitoring Methods
  async recordPerformanceMetric(metricData: any): Promise<any> {
    try {
      const newMetric = {
        metricType: metricData.metricType,
        metricName: metricData.metricName,
        value: metricData.value,
        unit: metricData.unit || 'ms',
        sessionId: metricData.sessionId || null,
        ipAddress: metricData.ipAddress || null,
        userAgent: metricData.userAgent || null,
        metadata: metricData.metadata || {},
        createdAt: new Date().toISOString()
      };

      // Try database first
      const { data: createdMetric } = await this.supabase
        .from('performance_metrics')
        .insert(newMetric)
        .select()
        .single();

      if (createdMetric) {
        return createdMetric;
      }

      // Fallback to JSON
      const metrics = this.loadJsonFile('performance-metrics.json');
      metrics.push(newMetric);
      this.saveJsonFile('performance-metrics.json', metrics);
      
      return newMetric;
    } catch (error) {
      console.error('Error recording performance metric:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(metricType?: string, timeRange?: { from: string; to: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .order('createdAt', { ascending: false });

      if (metricType) {
        query = query.eq('metricType', metricType);
      }

      if (timeRange) {
        query = query.gte('createdAt', timeRange.from).lte('createdAt', timeRange.to);
      }

      const { data: metrics } = await query;

      if (metrics && metrics.length > 0) {
        return metrics;
      }

      // Fallback to JSON
      const metricsData = this.loadJsonFile('performance-metrics.json');
      let filteredMetrics = metricsData;

      if (metricType) {
        filteredMetrics = filteredMetrics.filter((m: any) => m.metricType === metricType);
      }

      if (timeRange) {
        filteredMetrics = filteredMetrics.filter((m: any) => 
          new Date(m.createdAt) >= new Date(timeRange.from) && 
          new Date(m.createdAt) <= new Date(timeRange.to)
        );
      }

      return filteredMetrics;
    } catch (error) {
      console.warn('Database error, using JSON fallback for performance metrics:', error);
      const metricsData = this.loadJsonFile('performance-metrics.json');
      return metricsData;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent performance metrics
      const metrics = await this.getPerformanceMetrics(undefined, {
        from: oneHourAgo.toISOString(),
        to: now.toISOString()
      });

      // Calculate system health statistics
      const serverHealthMetrics = metrics.filter(m => m.metricType === 'server_health');
      const pageLoadMetrics = metrics.filter(m => m.metricType === 'page_load');
      const videoLoadMetrics = metrics.filter(m => m.metricType === 'video_load');
      const apiResponseMetrics = metrics.filter(m => m.metricType === 'api_response');

      const calculateStats = (metricArray: any[]) => {
        if (metricArray.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
        
        const values = metricArray.map(m => parseFloat(m.value));
        return {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      };

      return {
        serverHealth: calculateStats(serverHealthMetrics),
        pageLoad: calculateStats(pageLoadMetrics),
        videoLoad: calculateStats(videoLoadMetrics),
        apiResponse: calculateStats(apiResponseMetrics),
        totalMetrics: metrics.length,
        timeRange: {
          from: oneHourAgo.toISOString(),
          to: now.toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        serverHealth: { avg: 0, min: 0, max: 0, count: 0 },
        pageLoad: { avg: 0, min: 0, max: 0, count: 0 },
        videoLoad: { avg: 0, min: 0, max: 0, count: 0 },
        apiResponse: { avg: 0, min: 0, max: 0, count: 0 },
        totalMetrics: 0,
        error: 'Unable to retrieve system health data'
      };
    }
  }

  // Engagement Heatmap Methods
  async recordEngagementEvent(eventData: any): Promise<any> {
    try {
      const newEvent = {
        sessionId: eventData.sessionId,
        pageUrl: eventData.pageUrl,
        elementId: eventData.elementId || null,
        eventType: eventData.eventType,
        xPosition: eventData.xPosition || null,
        yPosition: eventData.yPosition || null,
        viewportWidth: eventData.viewportWidth || null,
        viewportHeight: eventData.viewportHeight || null,
        duration: eventData.duration || null,
        timestamp: new Date().toISOString()
      };

      // Try database first
      const { data: createdEvent } = await this.supabase
        .from('engagement_heatmap')
        .insert(newEvent)
        .select()
        .single();

      if (createdEvent) {
        return createdEvent;
      }

      // Fallback to JSON
      const events = this.loadJsonFile('engagement-heatmap.json');
      events.push(newEvent);
      this.saveJsonFile('engagement-heatmap.json', events);
      
      return newEvent;
    } catch (error) {
      console.error('Error recording engagement event:', error);
      throw error;
    }
  }

  async getEngagementHeatmap(pageUrl: string, timeRange?: { from: string; to: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('engagement_heatmap')
        .select('*')
        .eq('pageUrl', pageUrl)
        .order('timestamp', { ascending: false });

      if (timeRange) {
        query = query.gte('timestamp', timeRange.from).lte('timestamp', timeRange.to);
      }

      const { data: events } = await query;

      if (events && events.length > 0) {
        return events;
      }

      // Fallback to JSON
      const heatmapData = this.loadJsonFile('engagement-heatmap.json');
      let filteredEvents = heatmapData.filter((e: any) => e.pageUrl === pageUrl);

      if (timeRange) {
        filteredEvents = filteredEvents.filter((e: any) => 
          new Date(e.timestamp) >= new Date(timeRange.from) && 
          new Date(e.timestamp) <= new Date(timeRange.to)
        );
      }

      return filteredEvents;
    } catch (error) {
      console.warn('Database error, using JSON fallback for engagement heatmap:', error);
      const heatmapData = this.loadJsonFile('engagement-heatmap.json');
      return heatmapData.filter((e: any) => e.pageUrl === pageUrl);
    }
  }

  // Conversion Funnel Methods
  async recordConversionStep(stepData: any): Promise<any> {
    try {
      const newStep = {
        sessionId: stepData.sessionId,
        funnelStep: stepData.funnelStep,
        stepOrder: stepData.stepOrder,
        metadata: stepData.metadata || {},
        completedAt: new Date().toISOString()
      };

      // Try database first
      const { data: createdStep } = await this.supabase
        .from('conversion_funnel')
        .insert(newStep)
        .select()
        .single();

      if (createdStep) {
        return createdStep;
      }

      // Fallback to JSON
      const steps = this.loadJsonFile('conversion-funnel.json');
      steps.push(newStep);
      this.saveJsonFile('conversion-funnel.json', steps);
      
      return newStep;
    } catch (error) {
      console.error('Error recording conversion step:', error);
      throw error;
    }
  }

  async getConversionFunnel(timeRange?: { from: string; to: string }): Promise<any> {
    try {
      let query = this.supabase
        .from('conversion_funnel')
        .select('*')
        .order('completedAt', { ascending: false });

      if (timeRange) {
        query = query.gte('completedAt', timeRange.from).lte('completedAt', timeRange.to);
      }

      const { data: steps } = await query;

      if (steps && steps.length > 0) {
        return this.processFunnelData(steps);
      }

      // Fallback to JSON
      const funnelData = this.loadJsonFile('conversion-funnel.json');
      let filteredSteps = funnelData;

      if (timeRange) {
        filteredSteps = filteredSteps.filter((s: any) => 
          new Date(s.completedAt) >= new Date(timeRange.from) && 
          new Date(s.completedAt) <= new Date(timeRange.to)
        );
      }

      return this.processFunnelData(filteredSteps);
    } catch (error) {
      console.warn('Database error, using JSON fallback for conversion funnel:', error);
      const funnelData = this.loadJsonFile('conversion-funnel.json');
      return this.processFunnelData(funnelData);
    }
  }

  async getFunnelAnalytics(timeRange?: { from: string; to: string }): Promise<any> {
    try {
      const funnelData = await this.getConversionFunnel(timeRange);
      
      return {
        totalSessions: funnelData.uniqueSessions,
        conversionRates: funnelData.conversionRates,
        dropOffPoints: funnelData.dropOffAnalysis,
        timeToConvert: funnelData.timeAnalysis,
        funnelSteps: funnelData.stepDetails
      };
    } catch (error) {
      console.error('Error getting funnel analytics:', error);
      return {
        totalSessions: 0,
        conversionRates: {},
        dropOffPoints: [],
        timeToConvert: {},
        funnelSteps: []
      };
    }
  }

  private processFunnelData(steps: any[]): any {
    // Group by session
    const sessionGroups = steps.reduce((acc: any, step: any) => {
      if (!acc[step.sessionId]) {
        acc[step.sessionId] = [];
      }
      acc[step.sessionId].push(step);
      return acc;
    }, {});

    // Analyze conversion paths
    const stepCounts: { [key: string]: number } = {};
    const conversionRates: { [key: string]: number } = {};
    
    const funnelSteps = ['visit_home', 'view_gallery', 'view_video', 'contact_form', 'form_submit'];
    
    funnelSteps.forEach(step => {
      stepCounts[step] = 0;
    });

    Object.values(sessionGroups).forEach((sessionSteps: any) => {
      const completedSteps = new Set(sessionSteps.map((s: any) => s.funnelStep));
      
      funnelSteps.forEach(step => {
        if (completedSteps.has(step)) {
          stepCounts[step]++;
        }
      });
    });

    // Calculate conversion rates
    const totalSessions = Object.keys(sessionGroups).length;
    funnelSteps.forEach(step => {
      conversionRates[step] = totalSessions > 0 ? (stepCounts[step] / totalSessions) * 100 : 0;
    });

    return {
      uniqueSessions: totalSessions,
      stepCounts,
      conversionRates,
      stepDetails: funnelSteps.map(step => ({
        step,
        count: stepCounts[step],
        conversionRate: conversionRates[step]
      })),
      dropOffAnalysis: this.calculateDropOff(stepCounts, funnelSteps),
      timeAnalysis: this.calculateTimeToConvert(sessionGroups)
    };
  }

  private calculateDropOff(stepCounts: { [key: string]: number }, funnelSteps: string[]): any[] {
    const dropOff = [];
    
    for (let i = 1; i < funnelSteps.length; i++) {
      const currentStep = funnelSteps[i];
      const previousStep = funnelSteps[i - 1];
      
      const currentCount = stepCounts[currentStep];
      const previousCount = stepCounts[previousStep];
      
      if (previousCount > 0) {
        const dropOffRate = ((previousCount - currentCount) / previousCount) * 100;
        dropOff.push({
          fromStep: previousStep,
          toStep: currentStep,
          dropOffCount: previousCount - currentCount,
          dropOffRate: dropOffRate
        });
      }
    }
    
    return dropOff;
  }

  private calculateTimeToConvert(sessionGroups: any): any {
    const conversionTimes: number[] = [];
    
    Object.values(sessionGroups).forEach((sessionSteps: any) => {
      if (sessionSteps.length > 1) {
        const sortedSteps = sessionSteps.sort((a: any, b: any) => 
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );
        
        const firstStep = new Date(sortedSteps[0].completedAt);
        const lastStep = new Date(sortedSteps[sortedSteps.length - 1].completedAt);
        const timeDiff = (lastStep.getTime() - firstStep.getTime()) / 1000; // in seconds
        
        conversionTimes.push(timeDiff);
      }
    });
    
    if (conversionTimes.length === 0) {
      return { avg: 0, min: 0, max: 0, median: 0 };
    }
    
    conversionTimes.sort((a, b) => a - b);
    
    return {
      avg: conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length,
      min: conversionTimes[0],
      max: conversionTimes[conversionTimes.length - 1],
      median: conversionTimes[Math.floor(conversionTimes.length / 2)]
    };
  }
}

// Create singleton instance
export const hybridStorage = new HybridStorage();