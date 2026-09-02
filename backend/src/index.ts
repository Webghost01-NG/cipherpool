import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { defaultLogger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(config.PORT, () => {
  defaultLogger.info(`CipherPool Backend Service started successfully`, {
    port: config.PORT,
    nodeEnv: config.NODE_ENV,
    chainId: config.CHAIN_ID,
  });
});

function gracefulShutdown(signal: string) {
  defaultLogger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(() => {
    defaultLogger.info("HTTP server closed. Exiting process.");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
