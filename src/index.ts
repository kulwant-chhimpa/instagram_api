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

// Validate env before starting
validateConfig();

const app = express();

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

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`✓ Server running on http://localhost:${config.port}`);
  console.log(`  → GET /api/instagram?username=<username>`);
  console.log(`  → GET /health`);
  console.log(`  Cache TTL: ${config.cacheTtlHours}h`);
});
