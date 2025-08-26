import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// EXCLUSIVELY use Supabase VPS - NO other database providers allowed
if (!process.env.SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL must be set. Supabase VPS connection required.",
  );
}

// ALWAYS build connection string from SUPABASE_URL only - ignore DATABASE_URL completely
console.log('🔄 Building connection EXCLUSIVELY from SUPABASE_URL...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  throw new Error("SUPABASE_SERVICE_KEY must be set for database connection.");
}

// Use localhost connection with SSL disabled per VPS infrastructure fix
const connectionString = `postgresql://postgres:${supabaseKey}@127.0.0.1:5432/postgres?sslmode=disable`;

console.log('🔗 Connecting to Supabase VPS database via localhost (post-nginx fix)');

export const pool = postgres(connectionString);
export const db = drizzle(pool, { schema });