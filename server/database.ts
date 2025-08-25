import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Database connection setup using Supabase VPS only
let db: ReturnType<typeof drizzle> | null = null;

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("Testing Supabase VPS PostgreSQL connection...");
    
    if (!process.env.SUPABASE_URL) {
      console.error("❌ SUPABASE_URL not found in environment");
      return false;
    }
    
    // Build connection string from Supabase URL  
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      console.error("❌ SUPABASE_ANON_KEY not found in environment");
      return false;
    }
    
    // Extract host and build PostgreSQL connection
    const host = supabaseUrl.replace('https://', '').replace('http://', '');
    const connectionString = `postgresql://postgres:${process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey}@${host}:5432/postgres?sslmode=require`;
    
    // Create connection
    const client = postgres(connectionString);
    db = drizzle(client);
    
    // Simple connection test
    await client`SELECT 1 as test`;
    console.log("✅ Supabase VPS database connected successfully");
    return true;
    
  } catch (error) {
    console.error("❌ Supabase VPS database connection failed:", error);
    return false;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call testDatabaseConnection() first.");
  }
  return db;
}

// Auto-run test when module is imported directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseConnection().then(success => {
    console.log("Supabase VPS database test completed:", success ? "✅ Success" : "❌ Failed");
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error("Supabase VPS database test error:", err);
    process.exit(1);
  });
}