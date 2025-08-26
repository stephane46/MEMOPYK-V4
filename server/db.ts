import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Using SUPABASE VPS instead of Neon
if (!process.env.SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL must be set. Supabase VPS connection required.",
  );
}

// Build PostgreSQL connection string from Supabase URL
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error("SUPABASE_ANON_KEY must be set for database connection.");
}

// Extract host from Supabase URL
const host = supabaseUrl.replace('https://', '').replace('http://', '');
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_SUPABASESERVICE_KEY || supabaseKey;
const connectionString = `postgresql://postgres:${serviceKey}@${host}:5432/postgres?sslmode=require`;

console.log('🔗 Connecting to Supabase VPS database:', host);

export const pool = postgres(connectionString);
export const db = drizzle(pool, { schema });