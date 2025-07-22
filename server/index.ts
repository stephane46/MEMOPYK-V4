import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Standalone server for testing - avoiding vite.ts import issue
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Simple static file serving for testing
function serveStatic(app: express.Application) {
  // Minimal static serving for testing
}

// Database connection test as per Phase 2.2 of rebuild plan
import { testDatabaseConnection } from "./database";

console.log("=== MEMOPYK Server Starting ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ Available" : "❌ Missing");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ Available" : "❌ Missing");

// Test database connection
testDatabaseConnection().then(success => {
  if (success) {
    console.log("✅ Database connectivity confirmed - Phase 2.2 complete");
  } else {
    console.log("❌ Database connection test failed");
  }
}).catch(err => {
  console.error("❌ Database test error:", err);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("Server error:", message);
    res.status(status).json({ message });
    // Don't re-throw the error to prevent crashes
  });

  // Simple server for testing API endpoints
  const port = parseInt(process.env.PORT || '5000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`MEMOPYK API Server running on port ${port}`);
    console.log(`Test endpoints at: http://localhost:${port}/api`);
  });
})();
