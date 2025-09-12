import { createClient } from "@supabase/supabase-js";

type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<any>>();

// Pure Supabase client approach - no PostgreSQL connection
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Helper function to get current environment info
export function getCacheEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV || 'development',
    database: 'Supabase VPS (Pure Client)',
    connection: 'SUPABASE_URL + SUPABASE_ANON_KEY',
    autoCleanup: 'Enabled (24h retention + TTL expiry)',
    features: ['Persistent storage', 'Auto-cleanup trigger', 'TTL expiry', 'Pure Supabase client']
  };
}

// Manual cleanup function for administrative purposes
export async function manualCacheCleanup(): Promise<{ deleted: number; error?: string }> {
  try {
    if (!supabase) return { deleted: 0, error: 'Supabase client not available' };

    const { data, error } = await supabase
      .from("ga4_cache")
      .delete()
      .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    return { deleted: Array.isArray(data) ? data.length : 0 };
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

export function clearMemoryCache() {
  const size = store.size;
  store.clear();
  console.log(`🗑️ Memory cache cleared: ${size} entries removed`);
}

// Persistent cache functions (new)
export async function getDbCache<T>(key: string): Promise<T | null> {
  try {
    console.log(`🔍 Getting cache: ${key}`);
    
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
  } catch (error) {
    console.error('💥 getDbCache error:', error);
    return null;
  }
}

export async function setDbCache<T>(key: string, value: T, ttlSec = 300) {
  try {
    const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString();
    
    console.log(`💾 Setting cache: ${key} (TTL: ${ttlSec}s)`);
    
    if (!supabase) return;
    
    const { error } = await supabase
      .from("ga4_cache")
      .upsert({ key, value, expires_at }, { onConflict: "key" });
    
    if (error) {
      console.error('💥 setDbCache error:', error);
    } else {
      console.log(`✅ Cache set successfully: ${key}`);
    }
  } catch (error) {
    console.error('💥 setDbCache error:', error);
  }
}