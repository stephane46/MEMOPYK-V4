import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";

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
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware  
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
  // Register API routes first (before Vite middleware)
  registerRoutes(app);

  // Debug path resolution before Vite setup
  console.log("DEBUG: import.meta.dirname =", import.meta.dirname);
  console.log("DEBUG: process.cwd() =", process.cwd());
  console.log("DEBUG: __dirname exists?", typeof __dirname !== 'undefined' ? __dirname : 'undefined');
  
  // Setup Vite for React frontend (this must come after API routes)
  try {
    await setupVite(app, server);
  } catch (error) {
    console.error("Vite setup failed:", error);
    // Fallback: serve static files directly
    const path = await import("path");
    const clientPath = path.resolve(process.cwd(), "client");
    console.log("Fallback: serving client from", clientPath);
    app.use(express.static(clientPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.resolve(clientPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("Server error:", message);
    res.status(status).json({ message });
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, '0.0.0.0', () => {
    log(`MEMOPYK Server (React + API) running on port ${port}`);
    log(`React app: http://localhost:${port}`);
    log(`API endpoints: http://localhost:${port}/api`);
  });
})();
