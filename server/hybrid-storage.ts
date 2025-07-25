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
  updateFAQSection(sectionId: number, updates: any): Promise<any>;
  deleteFAQSection(sectionId: number): Promise<void>;
  
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
        .eq('is_active', true)
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
          section_id: parseInt(faq.section_id) || 0,
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
    const activeFaqs = data.filter(faq => faq.is_active);
    return sectionId ? activeFaqs.filter(f => f.section_id === parseInt(sectionId)) : activeFaqs;
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

  async updateFAQSection(sectionId: number, updates: any): Promise<any> {
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
        .eq('id', `section_${sectionId}`)
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

  async deleteFAQSection(sectionId: number): Promise<void> {
    try {
      console.log('🗑️ Deleting FAQ Section from Supabase:', sectionId);
      const { error } = await this.supabase
        .from('faq_sections')
        .delete()
        .eq('id', `section_${sectionId}`);
      
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
          section_id: parseInt(data.section_id) || 0,
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

  async updateFAQ(faqId: number, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating FAQ in Supabase:', faqId, updates);
      
      // Convert JSON format to database format if needed
      const dbUpdates: any = {};
      if (updates.question_en) dbUpdates.question_en = updates.question_en;
      if (updates.question_fr) dbUpdates.question_fr = updates.question_fr;
      if (updates.answer_en) dbUpdates.answer_en = updates.answer_en;
      if (updates.answer_fr) dbUpdates.answer_fr = updates.answer_fr;
      if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.section_id !== undefined) dbUpdates.section_id = updates.section_id.toString();
      
      const { data, error } = await this.supabase
        .from('faqs')
        .update(dbUpdates)
        .eq('id', faqId)
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ updated in Supabase:', data);
        
        // Convert back for JSON format
        const converted = {
          id: data.id,
          section_id: parseInt(data.section_id) || 0,
          question_en: data.question_en,
          question_fr: data.question_fr,
          answer_en: data.answer_en,
          answer_fr: data.answer_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup with same order swapping logic
        const faqs = this.loadJsonFile('faqs.json');
        const index = faqs.findIndex((faq: any) => faq.id === faqId);
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
            faqs[index] = { ...faqs[index], ...updates };
          }
          
          this.saveJsonFile('faqs.json', faqs);
        }
        
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

  async deleteFAQ(faqId: number): Promise<void> {
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
}

// Create singleton instance
export const hybridStorage = new HybridStorage();