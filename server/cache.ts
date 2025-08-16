import postgres from "postgres";

type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<any>>();

// Database connection for persistent cache
let dbClient: ReturnType<typeof postgres> | null = null;

function getDbClient() {
  if (!dbClient && process.env.DATABASE_URL) {
    dbClient = postgres(process.env.DATABASE_URL);
  }
  return dbClient;
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
    const db = getDbClient();
    if (!db) return null;

    const result = await db`
      SELECT value, expires 
      FROM ga4_cache 
      WHERE key = ${key}
    `;

    if (result.length === 0) return null;

    const data = result[0];
    if (new Date(data.expires).getTime() < Date.now()) {
      // Clean up expired entry
      await db`DELETE FROM ga4_cache WHERE key = ${key}`;
      return null;
    }

    return data.value as T;
  } catch (error) {
    console.error('getDbCache error:', error);
    return null;
  }
}

export async function setDbCache<T>(key: string, value: T, ttlSec = 300) {
  try {
    const db = getDbClient();
    if (!db) return;

    const expires = new Date(Date.now() + ttlSec * 1000).toISOString();
    
    await db`
      INSERT INTO ga4_cache (key, value, expires)
      VALUES (${key}, ${JSON.stringify(value)}, ${expires})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        expires = EXCLUDED.expires
    `;
  } catch (error) {
    console.error('setDbCache error:', error);
  }
}