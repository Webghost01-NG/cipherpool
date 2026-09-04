import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RPC_URL: z.string().url(),
  DATABASE_URL: z.string().refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "Must be a PostgreSQL connection URL"
  ),
  CHAIN_ID: z.coerce.number().default(11155111),
  POOL_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 20-byte EVM address"),
  CUSTODY_ASSET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 20-byte EVM address"),
  POOL_RUNTIME_CODE_HASH: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid bytes32 code hash"),
  RELAYER_URL: z.string().url().optional(),
  INDEXER_START_BLOCK: z.coerce.number().int().nonnegative(),
  INDEXER_BLOCK_BATCH_SIZE: z.coerce.number().int().positive().max(5000).default(500),
  POLL_INTERVAL_MS: z.coerce.number().default(3000),
  MAX_RETRIES: z.coerce.number().default(5),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(overrides: Partial<Record<string, string>> = {}): AppConfig {
  const merged = { ...process.env, ...overrides };
  const parsed = envSchema.safeParse(merged);

  if (!parsed.success) {
    console.error("Environment validation failed:", parsed.error.format());
    throw new Error("Invalid application environment configuration");
  }

  return parsed.data;
}
