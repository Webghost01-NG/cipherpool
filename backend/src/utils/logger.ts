export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private context: string;

  constructor(context: string = "CipherPoolBackend") {
    this.context = context;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(metadata ? { metadata } : {}),
    };

    const serialized = JSON.stringify(entry);
    if (level === "error") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      this.log("debug", message, metadata);
    }
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log("warn", message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>) {
    this.log("error", message, metadata);
  }
}

export const defaultLogger = new Logger();
