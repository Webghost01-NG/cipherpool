import type { PoolRuntimeVersion } from "./config.js";

export interface RuntimeProfile {
  codeHash: string;
  version: PoolRuntimeVersion;
}

export interface RuntimeCapabilities {
  exposesAggregateSnapshot: boolean;
  usesEncryptedReadiness: boolean;
}

export function resolveRuntimeProfile(
  observedCodeHash: string,
  profiles: readonly RuntimeProfile[]
): RuntimeProfile | null {
  const normalizedHash = observedCodeHash.toLowerCase();
  return profiles.find((profile) => profile.codeHash.toLowerCase() === normalizedHash) ?? null;
}

export function getRuntimeCapabilities(version: PoolRuntimeVersion): RuntimeCapabilities {
  if (version === "readiness-v2") {
    return { exposesAggregateSnapshot: false, usesEncryptedReadiness: true };
  }
  return { exposesAggregateSnapshot: true, usesEncryptedReadiness: false };
}
