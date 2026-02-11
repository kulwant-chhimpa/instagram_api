/**
 * Application entry point.
 *
 * Starts the Express server with:
 * - Rate limiting (defensive, per-IP)
 * - JSON responses
 * - Instagram profile lookup route
 */

import express from "express";
import rateLimit from "express-rate-limit";
import { config, validateConfig } from "./config";
import apiRouter from "./routes";

const app = express();

// Validate env on first request
let configValid = false;
let configError = "";

// ── Middleware ─────────────────────────────────────────────────────────────────

// Trust proxy (for rate-limiter behind reverse proxy / load balancer)
app.set("trust proxy", 1);

// Rate limiter: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.use(limiter);
app.use(express.json());

// Validate config on first request (make it optional for Vercel health checks)
app.use((req, res, next) => {
  if (!configValid) {
    try {
      // Allow health checks without full config
      if (req.path !== "/health") {
        validateConfig();
      }
      configValid = true;
    } catch (err) {
      configError = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        error: "Server configuration error",
        details: configError,
      });
    }
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api", apiRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler (must be last)
app.use(
  (
    err: Error | unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[error]", err);
    res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
);

// ── Export for Vercel ─────────────────────────────────────────────────────────

// For local development (only listen if NOT in Vercel)
if (process.env.VERCEL !== "1" && require.main === module) {
  app.listen(config.port, () => {
    console.log(`✓ Server running on http://localhost:${config.port}`);
    console.log(`  → GET /api/instagram?username=<username>`);
    console.log(`  → GET /health`);
    console.log(`  Cache TTL: ${config.cacheTtlHours}h`);
  });
}

// Export for Vercel serverless
export default app;
