import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Using SUPABASE VPS instead of Neon
if (!process.env.SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL must be set. Supabase VPS connection required.",
  );
}

// Use direct PostgreSQL connection to Supabase VPS
// First try DATABASE_URL if it points to Supabase, otherwise build from SUPABASE_URL
let connectionString = process.env.DATABASE_URL;

// Check if DATABASE_URL points to Supabase VPS
if (!connectionString || !connectionString.includes('supabase.memopyk.org')) {
  console.log('🔄 DATABASE_URL not pointing to Supabase VPS, building connection from SUPABASE_URL...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseKey) {
    throw new Error("SUPABASE_SERVICE_KEY must be set for database connection.");
  }
  
  // Extract host from Supabase URL  
  const host = supabaseUrl.replace('https://', '').replace('http://', '');
  connectionString = `postgresql://postgres:${supabaseKey}@${host}:5432/postgres?sslmode=require`;
}

// Extract host for logging
const host = connectionString.includes('supabase.memopyk.org') ? 'supabase.memopyk.org' : 'unknown';
console.log('🔗 Connecting to Supabase VPS database:', host);

export const pool = postgres(connectionString);
export const db = drizzle(pool, { schema });