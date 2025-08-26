import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";

import { registerRoutes } from "./routes";
import { log } from "./vite";           
import { testDatabaseConnection } from "./database";
import { VideoCache } from "./video-cache";

const VERSION = "1.0.52-deploy-fix";
console.log(`=== MEMOPYK Server Starting ${VERSION} ===`);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("🚨 DEPLOYMENT CHECK: NODE_ENV must be 'production' for correct HTML serving");
console.log("PORT:", process.env.PORT || 5000);
console.log(
  "🚫 DATABASE_URL (Neon):",
  "DISABLED - Using Supabase VPS only"
);
console.log(
  "SUPABASE_URL:",
  process.env.SUPABASE_URL ? "✅ Available" : "❌ Missing"
);

// Initialize video cache system for production gallery video support
console.log("🎬 Initializing video cache system...");
const videoCache = new VideoCache();
console.log("✅ Video cache system initialized");

// Test database connection (non-blocking)
testDatabaseConnection()
  .then((success) => {
    if (success) {
      console.log("✅ Database connectivity confirmed");
    } else {
      console.log("❌ Database connection test failed");
    }
  })
  .catch((err) => {
    console.error("❌ Database test error:", err);
  });

const app = express();
const server = createServer(app);

// Add health check endpoint (not root path - that should serve the app)
app.get('/api/health-check', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.50'
  });
});

// 🔍 ABSOLUTE FIRST MIDDLEWARE: Log EVERY request that reaches Express
app.use((req, res, next) => {
  // Debug logging disabled for production build performance
  next();
});

// Configure Express with large body limits for file uploads
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '5000mb',
  parameterLimit: 50000
}));

// Configure CSP headers to allow Google Analytics regional endpoints, Supabase, and Google Fonts
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://replit.com; " +
    "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net wss: ws:; " +
    "img-src 'self' data: https://*.google-analytics.com https://www.googletagmanager.com https://supabase.memopyk.org http://supabase.memopyk.org:8001 https://cdn.jsdelivr.net https://flagcdn.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "media-src 'self' https://supabase.memopyk.org http://supabase.memopyk.org:8001;"
  );
  next();
});

// 🔍 DIAGNOSTIC 2: Log ALL Proxy Requests (Before Any Route Logic) 
app.use('/api/video-proxy', (req, res, next) => {
  // Debug logging disabled for production build performance
  next();
});

// ULTIMATE REQUEST INTERCEPTOR: Capture ALL requests before ANY processing
app.use((req, res, next) => {
  // Debug logging disabled for production build performance
  next();
});

// EMERGENCY: Log ALL requests to diagnose production routing
app.use((req, res, next) => {
  // Emergency debug logging disabled for production build performance
  next();
});

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
  // 1) Register API routes FIRST - before any static file handling
  await registerRoutes(app);
  
  // --- BEGIN: correct content types for sitemap/robots ---
  const root = process.cwd();
  
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    res.type("application/xml");
    res.sendFile(path.join(root, "public", "sitemap.xml"));
  });

  app.get("/robots.txt", (req: Request, res: Response) => {
    res.type("text/plain");
    res.sendFile(path.join(root, "public", "robots.txt"));
  });
  // --- END ---
  
  // Add health check endpoint after API routes for better organization
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.50',
      uptime: process.uptime()
    });
  });

  // 2) Frontend handling
  if (process.env.NODE_ENV !== "production") {
    // — Dev mode: spawn Vite and proxy to it
    const viteProc = spawn("npx", ["vite"], {
      stdio: "inherit",
      env: process.env,
    });

    // Wait a bit for Vite to start before setting up proxy
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Serve static files before proxy (for images and other assets)
    app.use('/images', express.static(path.join(__dirname, '../public/images')));
    app.use('/logo.svg', express.static(path.join(__dirname, '../public/logo.svg')));
    app.use('/flags', express.static(path.join(__dirname, '../public/flags')));
    
    // Create proxy for Vite dev server
    const proxy = createProxyMiddleware({
      target: "http://localhost:5173",
      ws: true,
      changeOrigin: true,
      timeout: 10000,
    });

    // Proxy non-API requests to Vite dev server with error handling  
    app.use((req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/images") || req.path === "/logo.svg" || req.path.startsWith("/flags")) {
        return next(); // Skip proxy for API routes and static assets
      }
      
      // Handle proxy with try-catch
      try {
        return proxy(req, res, (error: any) => {
          if (error) {
            console.error("❌ Proxy error:", error.message);
            res.status(503).send('Vite dev server not ready. Please wait and refresh.');
          } else {
            next();
          }
        });
      } catch (error: any) {
        console.error("❌ Proxy setup error:", error.message);
        res.status(503).send('Proxy configuration error. Please restart the server.');
      }
    });

    console.log("🔄 Proxying frontend requests to Vite on port 5173");
  } else {
    // — Prod mode: serve static build
    const clientDist = path.resolve(process.cwd(), "dist");
    
    // CRITICAL FIX: Only serve static files for non-API routes
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Skip static serving for API routes only
      }
      express.static(clientDist, { index: false })(req, res, next);
    });
    
    // Serve flags from public directory in production
    app.use('/flags', express.static(path.resolve(process.cwd(), 'public/flags')));
    
    // Serve index.html for all non-API routes (SPA fallback)
    app.get("*", (req: Request, res: Response, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Let API routes be handled directly
      }
      res.sendFile(path.join(clientDist, "index.html"));
    });
    
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
  
  // Set server timeout for production deployments
  server.timeout = 30000; // 30 seconds timeout for requests
  server.headersTimeout = 31000; // Slightly higher than server timeout
  server.keepAliveTimeout = 5000; // Keep alive timeout
  
  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 MEMOPYK Server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`🔗 API endpoints: http://localhost:${port}/api`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`🔄 Dev frontend: http://localhost:${port} (proxied to Vite)`);
    } else {
      console.log(`📦 Frontend: http://localhost:${port}`);
    }
    console.log(`✅ ${VERSION} deployment ready!`);
  });
  
  // Handle deployment errors gracefully
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
    } else {
      console.error('❌ Server error:', err);
    }
    process.exit(1);
  });
})();