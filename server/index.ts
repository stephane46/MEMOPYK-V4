import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";

import { registerRoutes } from "./routes";
import { log } from "./vite";           // your existing log helper
import { testDatabaseConnection } from "./database";

console.log("=== MEMOPYK Server Starting ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "✅ Available" : "❌ Missing"
);
console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "✅ Available" : "❌ Missing"
);

// Test database connection
testDatabaseConnection()
  .then((success) => {
    if (success) {
      console.log("✅ Database connectivity confirmed - Phase 2.2 complete");
    } else {
      console.log("❌ Database connection test failed");
    }
  })
  .catch((err) => {
    console.error("❌ Database test error:", err);
  });

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: any;

  const origJson = res.json;
  res.json = function (body, ...args) {
    capturedJsonResponse = body;
    return origJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    if (pathReq.startsWith("/api")) {
      let duration = Date.now() - start;
      let line = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });

  next();
});

(async () => {
  // 1) Register API routes
  registerRoutes(app);

  // 2) Frontend handling
  if (process.env.NODE_ENV !== "production") {
    // — Dev mode: spawn Vite and proxy to it
    const viteProc = spawn("npx", ["vite"], {
      stdio: "inherit",
      env: process.env,
    });

    // Proxy non-API requests to Vite dev server
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Skip proxy for API routes
      }
      
      const proxy = createProxyMiddleware({
        target: "http://localhost:5173",
        ws: true,
        changeOrigin: true,
      });
      
      return proxy(req, res, next);
    });
    console.log("🔄 Proxying frontend requests to Vite on port 5173");
  } else {
    // — Prod mode: serve static build
    const clientDist = path.resolve(process.cwd(), "client/dist");
    app.use(express.static(clientDist));
    app.get("*", (_req: Request, res: Response) =>
      res.sendFile(path.join(clientDist, "index.html"))
    );
    console.log("📦 Serving static files from", clientDist);
  }

  // 3) Error handler
  app.use(
    (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", message);
      res.status(status).json({ message });
    }
  );

  // 4) Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`MEMOPYK Server running on port ${port}`);
    log(`API endpoints: http://localhost:${port}/api`);
    if (process.env.NODE_ENV !== "production") {
      log(`Dev frontend: http://localhost:${port} (proxied to Vite)`);
    } else {
      log(`Frontend: http://localhost:${port}`);
    }
  });
})();
