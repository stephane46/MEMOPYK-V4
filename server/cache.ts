import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<any>>();

// Use Supabase VPS for all environments (no Neon)
let pgClient: ReturnType<typeof postgres> | null = null;

export function getPgClient() {
  if (!pgClient && process.env.SUPABASE_URL) {
    // Build PostgreSQL connection from Supabase URL
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const host = supabaseUrl.replace('https://', '').replace('http://', '');
    const connectionString = `postgresql://postgres:${supabaseKey}@${host}:5432/postgres?sslmode=require`;
    pgClient = postgres(connectionString);
  }
  return pgClient;
}

// Supabase client for REST API
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

// Helper function to get current environment info
export function getCacheEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV || 'development',
    database: 'Supabase VPS (PostgreSQL)',
    connection: 'SUPABASE_URL',
    autoCleanup: 'Enabled (24h retention + TTL expiry)',
    features: ['Persistent storage', 'Auto-cleanup trigger', 'TTL expiry', 'Admin bypass']
  };
}

// Manual cleanup function for administrative purposes
export async function manualCacheCleanup(): Promise<{ deleted: number; error?: string }> {
  try {
    const pg = getPgClient();
    if (!pg) return { deleted: 0, error: 'Supabase PostgreSQL client not available' };

    const result = await pg`
      DELETE FROM ga4_cache 
      WHERE expires_at < NOW() - INTERVAL '1 day'
      RETURNING *
    `;
    
    return { deleted: result.length };
  } catch (error) {
    console.error('Manual cache cleanup error:', error);
    return { deleted: 0, error: String(error) };
  }
}

export function k(key: string) { 
  return `ga4:${key}`; 
}

// Memory cache functions (existing)
export function getCache<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { 
    store.delete(key); 
    return null; 
  }
  return e.value as T;
}

export function setCache<T>(key: string, value: T, ttlSec = 300) {
  store.set(key, { value, expires: Date.now() + ttlSec * 1000 });
}

// Persistent cache functions (new)
export async function getDbCache<T>(key: string): Promise<T | null> {
  try {
    console.log(`🔍 Getting cache: ${key}`);
    
    // Use Supabase VPS for all environments
    if (true) {
      // Use PostgreSQL in development
      const pg = getPgClient();
      if (!pg) return null;

      const result = await pg`
        SELECT value, expires_at 
        FROM ga4_cache 
        WHERE key = ${key}
      `;

      if (result.length === 0) {
        console.log(`❌ Cache miss: ${key} (no data)`);
        return null;
      }

      const data = result[0];
      if (new Date(data.expires_at).getTime() < Date.now()) {
        console.log(`⏰ Cache expired: ${key}`);
        // Clean up expired entry
        await pg`DELETE FROM ga4_cache WHERE key = ${key}`;
        return null;
      }

      console.log(`✅ Cache hit: ${key}`);
      // Ensure we return parsed JSON if it's a string (PostgreSQL stores as JSON string)
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } else {
      // Use Supabase in production
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from("ga4_cache")
        .select("value, expires_at")
        .eq("key", key)
        .single();

      if (error || !data) {
        console.log(`❌ Cache miss: ${key} (${error?.message || 'no data'})`);
        return null;
      }
      
      if (new Date(data.expires_at) < new Date()) {
        console.log(`⏰ Cache expired: ${key}`);
        // Clean up expired entry
        await supabase.from("ga4_cache").delete().eq("key", key);
        return null;
      }

      console.log(`✅ Cache hit: ${key}`);
      return data.value as T;
    }
  } catch (error) {
    console.error('💥 getDbCache error:', error);
    return null;
  }
}

export async function setDbCache<T>(key: string, value: T, ttlSec = 300) {
  try {
    const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
    
    console.log(`💾 Setting cache: ${key} (TTL: ${ttlSec}s)`);
    
    // Use Supabase VPS for all environments
    if (true) {
      // Use PostgreSQL in development
      const pg = getPgClient();
      if (!pg) return;

      await pg`
        INSERT INTO ga4_cache (key, value, expires_at)
        VALUES (${key}, ${JSON.stringify(value)}, ${expires_at})
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          expires_at = EXCLUDED.expires_at
      `;
      
      console.log(`✅ Cache set successfully: ${key}`);
    } else {
      // Use Supabase in production
      if (!supabase) return;
      
      const { error } = await supabase
        .from("ga4_cache")
        .upsert({ key, value, expires_at }, { onConflict: "key" });
      
      if (error) {
        console.error('💥 setDbCache error:', error);
      } else {
        console.log(`✅ Cache set successfully: ${key}`);
      }
    }
  } catch (error) {
    console.error('💥 setDbCache error:', error);
  }
}