import { Pool } from "pg";
import {
  IndexerStoreSnapshot,
  parseIndexerStoreSnapshot,
} from "./store.js";

interface QueryResult {
  rows: Array<Record<string, unknown>>;
}

export interface DatabasePool {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  end(): Promise<void>;
}

export interface PersistedIndexerCheckpoint {
  nextBlockNumber: number;
  snapshot: IndexerStoreSnapshot;
}

export class PostgresIndexerPersistence {
  private readonly pool: DatabasePool;
  private readonly namespace: string;

  constructor(databaseUrl: string, namespace: string, pool?: DatabasePool) {
    if (!databaseUrl) throw new Error("DATABASE_URL is required for indexer persistence.");
    if (!namespace) throw new Error("Indexer persistence namespace is required.");
    this.pool = pool ?? new Pool({
      connectionString: databaseUrl,
      max: 3,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    }) as DatabasePool;
    this.namespace = namespace;
  }

  public async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cipherpool_indexer_checkpoints (
        namespace TEXT PRIMARY KEY,
        next_block_number BIGINT NOT NULL CHECK (next_block_number >= 0),
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async load(): Promise<PersistedIndexerCheckpoint | null> {
    const result = await this.pool.query(
      `SELECT next_block_number::text, state
       FROM cipherpool_indexer_checkpoints
       WHERE namespace = $1`,
      [this.namespace]
    );
    const row = result.rows[0];
    if (!row) return null;

    const nextBlockNumber = Number(row.next_block_number);
    if (!Number.isSafeInteger(nextBlockNumber) || nextBlockNumber < 0) {
      throw new Error("Persisted indexer checkpoint contains an invalid next block number.");
    }

    return {
      nextBlockNumber,
      snapshot: parseIndexerStoreSnapshot(row.state),
    };
  }

  public async save(nextBlockNumber: number, snapshot: IndexerStoreSnapshot): Promise<void> {
    if (!Number.isSafeInteger(nextBlockNumber) || nextBlockNumber < 0) {
      throw new Error("Indexer checkpoint block number must be a non-negative safe integer.");
    }
    const validatedSnapshot = parseIndexerStoreSnapshot(snapshot);
    await this.pool.query(
      `INSERT INTO cipherpool_indexer_checkpoints (namespace, next_block_number, state, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (namespace) DO UPDATE SET
         next_block_number = EXCLUDED.next_block_number,
         state = EXCLUDED.state,
         updated_at = NOW()
       WHERE cipherpool_indexer_checkpoints.next_block_number <= EXCLUDED.next_block_number`,
      [this.namespace, nextBlockNumber.toString(), JSON.stringify(validatedSnapshot)]
    );
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
