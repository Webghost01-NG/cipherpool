import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { createApiRouter } from "./routes/api.js";
import { IndexerStore } from "./indexer/store.js";
import { KMSRelayerService } from "./relayer/relayer.js";
import { defaultLogger } from "./utils/logger.js";

export function createApp(
  store: IndexerStore = new IndexerStore(),
  relayer?: KMSRelayerService
): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      defaultLogger.info(`${req.method} ${req.originalUrl}`, {
        status: res.statusCode,
        durationMs,
        ip: req.ip,
      });
    });
    next();
  });

  // Health check routes
  app.use("/health", healthRouter);

  // V1 API routes
  app.use("/api/v1", createApiRouter(store, relayer));

  // Fallback 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: "NotFound",
      message: "The requested endpoint does not exist",
    });
  });

  // Central error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    defaultLogger.error("Unhandled server exception", { error: err.message, stack: err.stack });
    res.status(500).json({
      error: "InternalServerError",
      message: "An unexpected error occurred",
    });
  });

  return app;
}
