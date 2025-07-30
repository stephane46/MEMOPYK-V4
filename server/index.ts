import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";

import { registerRoutes } from "./routes";
import { log } from "./vite";           
import { testDatabaseConnection } from "./database";
import { VideoCache } from "./video-cache";

console.log("=== MEMOPYK Server Starting v1.0.50-route-entry-debug ===");
console.log("🔧 ROUTE DEBUGGING: Comprehensive request interception v1.0.50");
console.log("🎬 Gallery video routing debug active - every request logged");
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

// Initialize video cache system for production gallery video support
console.log("🎬 ROUTE DEBUGGING v1.0.50 - Initializing video cache system...");
const videoCache = new VideoCache();
console.log("✅ Video cache system initialized - comprehensive request logging active");

const app = express();
const server = createServer(app);

// 🔍 ABSOLUTE FIRST MIDDLEWARE: Log EVERY request that reaches Express
app.use((req, res, next) => {
  console.log(`🚨 ABSOLUTE REQUEST INTERCEPTOR v1.0.50: ${req.method} ${req.url}`);
  if (req.url.includes('PomGalleryC.mp4') || req.url.includes('video-proxy')) {
    console.log(`🎯 CRITICAL REQUEST DETECTED: ${req.url}`);
    console.log(`   - Method: ${req.method}`);
    console.log(`   - Path: ${req.path}`);
    console.log(`   - Query: ${JSON.stringify(req.query)}`);
    console.log(`   - User-Agent: ${req.headers['user-agent']?.slice(0, 100)}`);
  }
  next();
});

// Configure Express with large body limits for file uploads
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '5000mb',
  parameterLimit: 50000
}));

// 🔍 DIAGNOSTIC 2: Log ALL Proxy Requests (Before Any Route Logic) 
app.use('/api/video-proxy', (req, res, next) => {
  console.log('🔍 RAW VIDEO PROXY ENTRY', req.originalUrl, req.query);
  console.log('🔍 FILENAME REQUESTED:', req.query.filename);
  console.log('🔍 USER-AGENT:', req.headers['user-agent']);
  console.log('🔍 IF THIS LOG APPEARS FOR BLOCKED FILES, THEY REACH EXPRESS');
  next();
});

// ULTIMATE REQUEST INTERCEPTOR: Capture ALL requests before ANY processing
app.use((req, res, next) => {
  // Log EVERY video-proxy request, no matter what
  if (req.url.includes('video-proxy')) {
    console.log(`🔥 ULTIMATE INTERCEPTOR - RAW REQUEST CAPTURED:`);
    console.log(`   - Raw URL: ${req.url}`);
    console.log(`   - Method: ${req.method}`);
    console.log(`   - Path: ${req.path}`);
    console.log(`   - Raw query string: "${req.url.split('?')[1] || 'NO_QUERY'}"`);
    console.log(`   - Parsed query object:`, req.query);
    console.log(`   - URL length: ${req.url.length} characters`);
    console.log(`   - User-Agent: ${req.headers['user-agent']?.slice(0, 100)}`);
    
    // Check if this is any gallery video (updated for current filenames)
    const galleryVideoPatterns = [
      'VitaminSeaC.mp4',
      'PomGalleryC.mp4', 
      'safari-1.mp4'
    ];
    
    const isGalleryVideo = galleryVideoPatterns.some(pattern => req.url.includes(pattern));
    
    if (isGalleryVideo) {
      console.log(`🎯 GALLERY VIDEO REQUEST INTERCEPTED - v1.0.35 ENHANCED DEBUG!`);
      console.log(`   - Full raw URL: ${req.url}`);
      console.log(`   - URL breakdown:`);
      console.log(`     - Base: ${req.url.split('?')[0]}`);
      console.log(`     - Query: ${req.url.split('?')[1] || 'NONE'}`);
      console.log(`   - Headers:`, JSON.stringify({
        range: req.headers.range,
        accept: req.headers.accept,
        'user-agent': req.headers['user-agent']?.slice(0, 50),
        'accept-encoding': req.headers['accept-encoding']
      }, null, 2));
      console.log(`🚨 CRITICAL: If you see this log, gallery requests ARE reaching the server!`);
    }
  }
  next();
});

// EMERGENCY: Log ALL requests to diagnose production routing
app.use((req, res, next) => {
  if (req.path.includes('/api/video-proxy') || req.path.includes('/api/debug-gallery-video')) {
    console.log(`🚨 EMERGENCY REQUEST LOG: ${req.method} ${req.path} from ${req.headers['user-agent']?.slice(0, 50)}`);
    console.log(`   - Query params:`, req.query);
    console.log(`   - Headers:`, { range: req.headers.range, accept: req.headers.accept });
    
    // STEP 1: COMPREHENSIVE PRODUCTION 500 DEBUGGING - FULL HEADER CONTEXT
    console.log(`📋 PRODUCTION 500 DEBUG - COMPLETE REQUEST CONTEXT v1.0.18:`);
    console.log(`   - Accept-Encoding: "${req.headers['accept-encoding']}"`);
    console.log(`   - sec-ch-ua-mobile: "${req.headers['sec-ch-ua-mobile']}"`);
    console.log(`   - sec-ch-ua-platform: "${req.headers['sec-ch-ua-platform']}"`);
    console.log(`   - Connection: "${req.headers.connection}"`);
    console.log(`   - Cache-Control: "${req.headers['cache-control']}"`);
    console.log(`   - Pragma: "${req.headers.pragma}"`);
    console.log(`   - Priority: "${req.headers.priority}"`);
    console.log(`   - sec-fetch-dest: "${req.headers['sec-fetch-dest']}"`);
    console.log(`   - sec-fetch-mode: "${req.headers['sec-fetch-mode']}"`);
    console.log(`   - sec-fetch-site: "${req.headers['sec-fetch-site']}"`);
    console.log(`📋 FULL REQ.HEADERS OBJECT:`, JSON.stringify(req.headers, null, 2));
  }
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
  registerRoutes(app);

  // 2) Frontend handling
  if (process.env.NODE_ENV !== "production") {
    // — Dev mode: spawn Vite and proxy to it
    const viteProc = spawn("npx", ["vite"], {
      stdio: "inherit",
      env: process.env,
    });

    // Wait a bit for Vite to start before setting up proxy
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create proxy for Vite dev server
    const proxy = createProxyMiddleware({
      target: "http://localhost:5173",
      ws: true,
      changeOrigin: true,
      timeout: 10000,
    });

    // Server-side hreflang injection for development mode
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Skip for API routes
      }
      
      // In development, serve dynamic SEO HTML to all users for testing consistency
      if (req.path === '/' || req.path === '/index.html') {
        const fs = require('fs');
        const htmlPath = path.resolve(process.cwd(), "public/index.html");
        
        try {
          let html = fs.readFileSync(htmlPath, 'utf8');
          
          // Determine the base URL for hreflang tags
          const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
          const host = req.headers['x-forwarded-host'] || req.headers.host;
          const baseUrl = `${protocol}://${host}`;
          
          // Replace dynamic placeholders with actual URLs
          html = html.replace(/DYNAMIC_BASE_URL/g, baseUrl);
          
          // Determine current language from path and set canonical URL
          const currentPath = req.path;
          let canonicalUrl = baseUrl;
          
          if (currentPath.startsWith('/en') || req.query.lang === 'en') {
            canonicalUrl = `${baseUrl}/en/`;
          } else if (currentPath.startsWith('/fr') || req.query.lang === 'fr') {
            canonicalUrl = `${baseUrl}/fr/`;
          } else {
            canonicalUrl = `${baseUrl}/`; // x-default
          }
          
          html = html.replace(/DYNAMIC_CANONICAL_URL/g, canonicalUrl);
          
          const userAgent = req.headers['user-agent'] || '';
          console.log(`🔍 SEO DEVELOPMENT: Serving ${req.path} to ${userAgent.slice(0, 50)} with baseUrl: ${baseUrl}`);
          
          // Add cache-busting headers for development consistency
          res.set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          
          res.send(html);
          return;
        } catch (error) {
          console.error('❌ Error serving dynamic HTML in dev:', error);
          // Fall through to proxy for error cases
        }
      }
      
      // Proxy other requests to Vite dev server
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
    // — Prod mode: serve static build with dynamic hreflang injection
    const clientDist = path.resolve(process.cwd(), "dist");
    
    // CRITICAL FIX: Only serve static files for non-API routes (but NOT index.html)
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Skip static serving for API routes
      }
      
      // Don't serve index.html statically - we'll handle it dynamically
      if (req.path === '/' || req.path === '/index.html') {
        return next();
      }
      
      express.static(clientDist, { index: false })(req, res, next);
    });
    
    // Server-side HTML serving with dynamic hreflang tags for ALL requests in production
    app.get("*", (req: Request, res: Response, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Let API routes be handled by registerRoutes
      }
      
      // In production, serve dynamic HTML to ALL users for maximum SEO compatibility
      const fs = require('fs');
      
      // Try to use public/index.html with placeholders, fallback to dist/index.html
      let htmlPath = path.resolve(process.cwd(), "public/index.html");
      let usePublicTemplate = true;
      
      if (!fs.existsSync(htmlPath)) {
        htmlPath = path.join(clientDist, "index.html");
        usePublicTemplate = false;
      }
      
      try {
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Determine the base URL for hreflang tags
        const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        
        // Determine current language from path and set canonical URL
        const currentPath = req.path;
        let canonicalUrl = baseUrl;
        
        if (currentPath.startsWith('/en') || currentPath.includes('lang=en')) {
          canonicalUrl = `${baseUrl}/en/`;
        } else if (currentPath.startsWith('/fr') || currentPath.includes('lang=fr')) {
          canonicalUrl = `${baseUrl}/fr/`;
        } else {
          canonicalUrl = `${baseUrl}/`; // x-default
        }
        
        if (usePublicTemplate) {
          // Replace dynamic placeholders with actual URLs
          html = html.replace(/DYNAMIC_BASE_URL/g, baseUrl);
          html = html.replace(/DYNAMIC_CANONICAL_URL/g, canonicalUrl);
        } else {
          // If using dist/index.html, inject SEO tags into the head section
          const seoTags = `
  <!-- Hreflang Tags for SEO -->
  <link rel="alternate" hreflang="en" href="${baseUrl}/en/" />
  <link rel="alternate" hreflang="fr" href="${baseUrl}/fr/" />
  <link rel="alternate" hreflang="x-default" href="${baseUrl}/" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}" />`;
          
          html = html.replace('</head>', `${seoTags}
</head>`);
        }
        
        const userAgent = req.headers['user-agent'] || '';
        console.log(`🔍 SEO PRODUCTION: Serving ${req.path} to ${userAgent.slice(0, 50)} with baseUrl: ${baseUrl}`);
        console.log(`📄 Template Source: ${usePublicTemplate ? 'public/index.html' : 'dist/index.html'}`);
        console.log(`🏷️ SEO Tags Injected: hreflang (en, fr, x-default), canonical (${canonicalUrl})`);
        
        // Debug: Log first 10 lines of processed HTML
        const htmlLines = html.split('\n');
        console.log(`📋 HTML Preview (first 10 lines):`);
        htmlLines.slice(0, 10).forEach((line: string, i: number) => {
          console.log(`${i + 1}: ${line}`);
        });
        
        // Add cache-busting headers to prevent CDN caching of dynamic content
        res.set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        res.send(html);
        return;
      } catch (error) {
        console.error('❌ Error serving dynamic HTML in prod:', error);
        console.error('❌ HTML Path attempted:', htmlPath);
        console.error('❌ Use public template:', usePublicTemplate);
        // Fallback to static file
        res.sendFile(path.join(clientDist, "index.html"));
      }
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