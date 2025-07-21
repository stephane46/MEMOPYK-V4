import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Database connection setup for Phase 2.2 testing
let db: ReturnType<typeof drizzle> | null = null;

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("Testing PostgreSQL connection...");
    
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL not found in environment");
      return false;
    }
    
    // Create connection
    const client = postgres(process.env.DATABASE_URL);
    db = drizzle(client);
    
    // Simple connection test
    await client`SELECT 1 as test`;
    console.log("✅ Database connected successfully");
    return true;
    
  } catch (error) {
    console.error("❌ Database connection failed:", error);
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
    console.log("Database test completed:", success ? "✅ Success" : "❌ Failed");
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error("Database test error:", err);
    process.exit(1);
  });
}