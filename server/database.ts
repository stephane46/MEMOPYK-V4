import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Database connection setup using Supabase VPS only
let db: ReturnType<typeof drizzle> | null = null;

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("Testing PostgreSQL connection via DATABASE_URL (post-nginx fix)...");
    
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL not found in environment");
      return false;
    }
    
    // Force direct connection - explicitly disable SSH tunneling for database
    if (process.env.SSH_PASSWORD || process.env.SSH_PRIVATE_KEY) {
      console.log('🔒 SSH keys available but using direct database connection (no tunneling)');
    }
    
    // Use DATABASE_URL for direct localhost connection
    const connectionString = process.env.DATABASE_URL;
    
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