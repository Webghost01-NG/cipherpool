import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RPC_URL: z.string().url().default("http://127.0.0.1:8545"),
  CHAIN_ID: z.coerce.number().default(11155111),
  POOL_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 20-byte EVM address")
    .default("0x1111111111111111111111111111111111111111"),
  RELAYER_PRIVATE_KEY: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Must be a valid 32-byte private key")
    .default("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
  KMS_GATEWAY_URL: z.string().url().default("https://gateway.sepolia.zama.ai"),
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

export const config = loadConfig();
