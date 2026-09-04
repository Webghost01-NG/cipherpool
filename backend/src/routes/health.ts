import { Router, Request, Response } from "express";

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "veylott-backend",
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

healthRouter.get("/ready", (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    status: "ready",
    service: "veylott-backend",
    checks: {
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memoryRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
    },
    timestamp: new Date().toISOString(),
  });
});
