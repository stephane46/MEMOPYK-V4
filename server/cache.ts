type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<any>>();

export function k(key: string) { 
  return `ga4:${key}`; 
}

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