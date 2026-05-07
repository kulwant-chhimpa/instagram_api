import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import postRouter from "./routes";

const app = express();

app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.use(limiter);
app.use(express.json());
app.use("/api", postRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error | unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[post-scraper] error", err);
    res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
);

if (process.env.VERCEL !== "1" && require.main === module) {
  app.listen(config.port, () => {
    console.log(`✓ Post scraper running on http://localhost:${config.port}`);
    console.log(`  → GET /api/instagram/posts?username=<username>`);
    console.log(`  → POST /api/instagram/hashtags`);
    console.log(`  → GET /health`);
  });
}

export default app;