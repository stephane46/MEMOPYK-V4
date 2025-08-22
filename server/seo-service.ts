import { z } from "zod";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import fs from 'fs/promises';
import path from 'path';
import { sql } from "drizzle-orm";

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Validation schemas
export const seoDataSchema = z.object({
  lang: z.enum(['fr-FR', 'en-US']),
  title: z.string().max(70).optional(),
  description: z.string().max(320).optional(),
  canonical: z.string().url().optional(),
  keywords: z.string().optional(),
  robotsIndex: z.boolean().default(true),
  robotsFollow: z.boolean().default(true),
  robotsNoArchive: z.boolean().default(false),
  robotsNoSnippet: z.boolean().default(false),
  jsonLd: z.string().optional().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "Invalid JSON-LD format"),
  openGraph: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    type: z.string().default('website'),
    url: z.string().url().optional()
  }).optional(),
  twitter: z.object({
    card: z.string().default('summary_large_image'),
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().url().optional()
  }).optional(),
  hreflang: z.array(z.object({
    lang: z.string(),
    href: z.string().url()
  })).optional(),
  extras: z.array(z.object({
    name: z.string(),
    content: z.string()
  })).optional()
});

export type SeoData = z.infer<typeof seoDataSchema>;

export class SeoService {
  private readonly MAX_HISTORY_VERSIONS = 10;
  private readonly BACKUP_DIR = 'data/seo-backups';

  constructor() {
    this.ensureBackupDir();
  }

  private async ensureBackupDir() {
    try {
      await fs.mkdir(this.BACKUP_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Sanitize and validate SEO data
   */
  private sanitizeData(data: SeoData): SeoData {
    const sanitized = { ...data };
    
    // Sanitize text fields
    if (sanitized.title) {
      sanitized.title = purify.sanitize(sanitized.title, { ALLOWED_TAGS: [] });
    }
    if (sanitized.description) {
      sanitized.description = purify.sanitize(sanitized.description, { ALLOWED_TAGS: [] });
    }
    if (sanitized.keywords) {
      sanitized.keywords = purify.sanitize(sanitized.keywords, { ALLOWED_TAGS: [] });
    }

    // Validate URLs
    if (sanitized.canonical && !this.isValidUrl(sanitized.canonical)) {
      delete sanitized.canonical;
    }

    // Sanitize OpenGraph data
    if (sanitized.openGraph) {
      if (sanitized.openGraph.title) {
        sanitized.openGraph.title = purify.sanitize(sanitized.openGraph.title, { ALLOWED_TAGS: [] });
      }
      if (sanitized.openGraph.description) {
        sanitized.openGraph.description = purify.sanitize(sanitized.openGraph.description, { ALLOWED_TAGS: [] });
      }
    }

    // Sanitize Twitter data
    if (sanitized.twitter) {
      if (sanitized.twitter.title) {
        sanitized.twitter.title = purify.sanitize(sanitized.twitter.title, { ALLOWED_TAGS: [] });
      }
      if (sanitized.twitter.description) {
        sanitized.twitter.description = purify.sanitize(sanitized.twitter.description, { ALLOWED_TAGS: [] });
      }
    }

    // Validate hreflang URLs
    if (sanitized.hreflang) {
      sanitized.hreflang = sanitized.hreflang.filter(item => 
        this.isValidUrl(item.href) && this.isSameDomain(item.href)
      );
    }

    // Sanitize extra meta tags
    if (sanitized.extras) {
      sanitized.extras = sanitized.extras.map(extra => ({
        name: purify.sanitize(extra.name, { ALLOWED_TAGS: [] }),
        content: purify.sanitize(extra.content, { ALLOWED_TAGS: [] })
      }));
    }

    return sanitized;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isSameDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'memopyk.com' || urlObj.hostname.endsWith('.memopyk.com');
    } catch {
      return false;
    }
  }

  /**
   * Get current SEO settings for a language
   */
  async getSeoSettings(lang: 'fr-FR' | 'en-US'): Promise<SeoData | null> {
    try {
      // For now, return fallback data until database is set up
      return this.getFallbackSeoData(lang);
      
      /*
      const settings = await db
        .select()
        .from(seoSettings)
        .where(eq(seoSettings.lang, lang))
        .orderBy(desc(seoSettings.updatedAt))
        .limit(1);*/

      if (settings.length === 0) {
        return null;
      }

      const setting = settings[0];
      return {
        lang,
        title: setting.title || undefined,
        description: setting.description || undefined,
        canonical: setting.canonical || undefined,
        keywords: setting.keywords || undefined,
        robotsIndex: setting.robotsIndex,
        robotsFollow: setting.robotsFollow,
        robotsNoArchive: setting.robotsNoArchive,
        robotsNoSnippet: setting.robotsNoSnippet,
        jsonLd: setting.jsonLd || undefined,
        openGraph: setting.openGraph as any,
        twitter: setting.twitter as any,
        hreflang: setting.hreflang as any,
        extras: setting.extras as any
      };
    } catch (error) {
      console.error('Error fetching SEO settings:', error);
      return this.getFallbackSeoData(lang);
    }
  }

  /**
   * Save SEO settings with validation and history tracking
   */
  async saveSeoSettings(data: SeoData, adminUser: string, changeReason?: string): Promise<void> {
    // Validate input data
    const validatedData = seoDataSchema.parse(data);
    const sanitizedData = this.sanitizeData(validatedData);

    try {
      // For now, save to JSON backup file until database is set up
      await this.createBackup(sanitizedData, adminUser);
      
      console.log(`✅ SEO settings saved for ${sanitizedData.lang} by ${adminUser}`);
      
      /*
      // Get current settings for diff calculation
      const currentSettings = await this.getSeoSettings(sanitizedData.lang);

      // Insert or update settings
      const now = new Date();
      const settingsData = {
        lang: sanitizedData.lang,
        title: sanitizedData.title || null,
        description: sanitizedData.description || null,
        canonical: sanitizedData.canonical || null,
        keywords: sanitizedData.keywords || null,
        robotsIndex: sanitizedData.robotsIndex,
        robotsFollow: sanitizedData.robotsFollow,
        robotsNoArchive: sanitizedData.robotsNoArchive,
        robotsNoSnippet: sanitizedData.robotsNoSnippet,
        jsonLd: sanitizedData.jsonLd || null,
        openGraph: sanitizedData.openGraph || null,
        twitter: sanitizedData.twitter || null,
        hreflang: sanitizedData.hreflang || null,
        extras: sanitizedData.extras || null,
        createdBy: adminUser,
        updatedAt: now
      };

      // Save to database
      const result = await db
        .insert(seoSettings)
        .values(settingsData)
        .onConflictDoUpdate({
          target: seoSettings.lang,
          set: {
            ...settingsData,
            version: sql`${seoSettings.version} + 1`,
            updatedAt: now
          }
        })
        .returning();

      // Save to history
      await this.saveToHistory(result[0].id, sanitizedData, adminUser, changeReason, currentSettings);

      // Clean up old history
      await this.cleanupHistory(sanitizedData.lang);
      */

    } catch (error) {
      console.error('Error saving SEO settings:', error);
      throw new Error('Failed to save SEO settings');
    }
  }

  /**
   * Save version to history
   */
  private async saveToHistory(
    seoId: string, 
    data: SeoData, 
    adminUser: string, 
    changeReason?: string,
    previousData?: SeoData | null
  ): Promise<void> {
    // For now, just log the history until database is set up
    const diff = this.calculateDiff(previousData, data);
    console.log(`📝 SEO History: ${data.lang} changed by ${adminUser}:`, diff);
    
    /*
    await db.insert(seoHistory).values({
      seoId,
      lang: data.lang,
      version: 1, // Will be updated by trigger
      data: data as any,
      diff: diff as any,
      changeReason: changeReason || null,
      createdBy: adminUser
    });
    */
  }

  /**
   * Calculate differences between two SEO data objects
   */
  private calculateDiff(previous: SeoData | null, current: SeoData): Record<string, any> {
    if (!previous) return { action: 'created', changes: current };

    const changes: Record<string, { from: any; to: any }> = {};
    
    Object.keys(current).forEach(key => {
      const prevValue = previous[key as keyof SeoData];
      const currValue = current[key as keyof SeoData];
      
      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changes[key] = { from: prevValue, to: currValue };
      }
    });

    return { action: 'updated', changes };
  }

  /**
   * Get SEO history for a language
   */
  async getSeoHistory(lang: 'fr-FR' | 'en-US'): Promise<any[]> {
    try {
      // For now, return empty history until database is set up
      return [];
      
      /*
      return await db
        .select()
        .from(seoHistory)
        .where(eq(seoHistory.lang, lang))
        .orderBy(desc(seoHistory.createdAt))
        .limit(this.MAX_HISTORY_VERSIONS);
      */
    } catch (error) {
      console.error('Error fetching SEO history:', error);
      return [];
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(lang: 'fr-FR' | 'en-US', version: number, adminUser: string): Promise<void> {
    try {
      // For now, just return error until database is set up
      throw new Error('Rollback functionality not available yet');
      
      /*
      const historyEntry = await db
        .select()
        .from(seoHistory)
        .where(eq(seoHistory.lang, lang))
        .where(eq(seoHistory.version, version))
        .limit(1);

      if (historyEntry.length === 0) {
        throw new Error('Version not found');
      }

      const data = historyEntry[0].data as SeoData;
      await this.saveSeoSettings(data, adminUser, `Rollback to version ${version}`);
      */

    } catch (error) {
      console.error('Error rolling back SEO settings:', error);
      throw new Error('Failed to rollback SEO settings');
    }
  }

  /**
   * Generate HTML head preview
   */
  async generateHeadPreview(lang: 'fr-FR' | 'en-US'): Promise<string> {
    const data = await this.getSeoSettings(lang) || this.getFallbackSeoData(lang);
    
    const lines: string[] = [];
    
    // Basic SEO tags
    if (data.title) {
      lines.push(`<title>${this.escapeHtml(data.title)}</title>`);
    }
    if (data.description) {
      lines.push(`<meta name="description" content="${this.escapeHtml(data.description)}" />`);
    }
    if (data.keywords) {
      lines.push(`<meta name="keywords" content="${this.escapeHtml(data.keywords)}" />`);
    }
    if (data.canonical) {
      lines.push(`<link rel="canonical" href="${this.escapeHtml(data.canonical)}" />`);
    }

    // Robots meta
    const robotsContent = [];
    if (data.robotsIndex) robotsContent.push('index'); else robotsContent.push('noindex');
    if (data.robotsFollow) robotsContent.push('follow'); else robotsContent.push('nofollow');
    if (data.robotsNoArchive) robotsContent.push('noarchive');
    if (data.robotsNoSnippet) robotsContent.push('nosnippet');
    lines.push(`<meta name="robots" content="${robotsContent.join(', ')}" />`);

    // Hreflang
    if (data.hreflang) {
      data.hreflang.forEach(item => {
        lines.push(`<link rel="alternate" hreflang="${this.escapeHtml(item.lang)}" href="${this.escapeHtml(item.href)}" />`);
      });
    }

    // Open Graph
    if (data.openGraph) {
      if (data.openGraph.title) {
        lines.push(`<meta property="og:title" content="${this.escapeHtml(data.openGraph.title)}" />`);
      }
      if (data.openGraph.description) {
        lines.push(`<meta property="og:description" content="${this.escapeHtml(data.openGraph.description)}" />`);
      }
      if (data.openGraph.image) {
        lines.push(`<meta property="og:image" content="${this.escapeHtml(data.openGraph.image)}" />`);
      }
      if (data.openGraph.type) {
        lines.push(`<meta property="og:type" content="${this.escapeHtml(data.openGraph.type)}" />`);
      }
      if (data.openGraph.url) {
        lines.push(`<meta property="og:url" content="${this.escapeHtml(data.openGraph.url)}" />`);
      }
    }

    // Twitter Card
    if (data.twitter) {
      if (data.twitter.card) {
        lines.push(`<meta name="twitter:card" content="${this.escapeHtml(data.twitter.card)}" />`);
      }
      if (data.twitter.title) {
        lines.push(`<meta name="twitter:title" content="${this.escapeHtml(data.twitter.title)}" />`);
      }
      if (data.twitter.description) {
        lines.push(`<meta name="twitter:description" content="${this.escapeHtml(data.twitter.description)}" />`);
      }
      if (data.twitter.image) {
        lines.push(`<meta name="twitter:image" content="${this.escapeHtml(data.twitter.image)}" />`);
      }
    }

    // JSON-LD structured data
    if (data.jsonLd) {
      try {
        JSON.parse(data.jsonLd); // Validate JSON
        lines.push(`<script type="application/ld+json">${data.jsonLd}</script>`);
      } catch (error) {
        console.warn('Invalid JSON-LD, skipping:', error);
      }
    }

    // Extra meta tags
    if (data.extras) {
      data.extras.forEach(extra => {
        lines.push(`<meta name="${this.escapeHtml(extra.name)}" content="${this.escapeHtml(extra.content)}" />`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get fallback SEO data
   */
  private getFallbackSeoData(lang: 'fr-FR' | 'en-US'): SeoData {
    const isFrench = lang === 'fr-FR';
    
    return {
      lang,
      title: isFrench 
        ? 'MEMOPYK – Films & albums souvenirs à partir de vos photos et vidéos'
        : 'MEMOPYK – Unique memory films & albums from your photos and videos',
      description: isFrench
        ? 'MEMOPYK transforme vos photos et vidéos en albums et films souvenirs uniques. Un service 100 % humain, créatif et inspirant.'
        : 'MEMOPYK turns your photos and videos into unique memory films and albums. A fully human, creative, and inspiring service.',
      canonical: `https://memopyk.com/${lang}`,
      robotsIndex: true,
      robotsFollow: true,
      robotsNoArchive: false,
      robotsNoSnippet: false,
      hreflang: [
        { lang: 'fr-FR', href: 'https://memopyk.com/fr-FR' },
        { lang: 'en-US', href: 'https://memopyk.com/en-US' },
        { lang: 'x-default', href: 'https://memopyk.com/en-US' }
      ],
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "MEMOPYK",
        "url": "https://memopyk.com",
        "logo": "https://memopyk.com/logo.png",
        "sameAs": []
      })
    };
  }

  /**
   * Clean up old history versions
   */
  private async cleanupHistory(lang: 'fr-FR' | 'en-US'): Promise<void> {
    try {
      // For now, just log until database is set up
      console.log(`🧹 SEO History cleanup for ${lang} (not implemented yet)`);
      
      /*
      const history = await db
        .select({ id: seoHistory.id })
        .from(seoHistory)
        .where(eq(seoHistory.lang, lang))
        .orderBy(desc(seoHistory.createdAt))
        .offset(this.MAX_HISTORY_VERSIONS);

      if (history.length > 0) {
        const idsToDelete = history.map(h => h.id);
        await db.delete(seoHistory).where(sql`id IN (${idsToDelete.join(',')})`);
      }
      */
    } catch (error) {
      console.error('Error cleaning up SEO history:', error);
    }
  }

  /**
   * Create backup file
   */
  async createBackup(data: SeoData, adminUser: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `seo-backup-${data.lang}-${timestamp}.json`;
      const filepath = path.join(this.BACKUP_DIR, filename);
      
      const backupData = {
        ...data,
        backupCreatedAt: new Date().toISOString(),
        backupCreatedBy: adminUser
      };
      
      await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

export const seoService = new SeoService();