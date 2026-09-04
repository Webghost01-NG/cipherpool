export type RpcRoute = "application" | "wallet";

function collectErrorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const record = error as Record<string, unknown>;
  const parts = [record.code, record.shortMessage, record.message];
  for (const nestedKey of ["error", "info"]) {
    const nested = record[nestedKey];
    if (nested && typeof nested === "object") {
      const nestedRecord = nested as Record<string, unknown>;
      parts.push(nestedRecord.code, nestedRecord.message);
      const nestedError = nestedRecord.error;
      if (nestedError && typeof nestedError === "object") {
        parts.push((nestedError as Record<string, unknown>).code, (nestedError as Record<string, unknown>).message);
      }
    }
  }
  return parts.filter((part) => typeof part === "string" || typeof part === "number").join(" ").toLowerCase();
}

export function describeRpcFailure(error: unknown, route: RpcRoute): string {
  const text = collectErrorText(error);
  const prefix = route === "wallet" ? "Your wallet's Sepolia RPC" : "Veylott's Sepolia read providers";

  if (text.includes("429") || text.includes("rate limit") || text.includes("too many requests")) {
    return `${prefix} is rate-limited. Retry shortly${route === "wallet" ? " or switch the wallet's Sepolia RPC." : "."}`;
  }
  if (text.includes("timeout") || text.includes("timed out") || text.includes("network") || text.includes("failed to fetch")) {
    return `${prefix} is temporarily unreachable. Retry shortly${route === "wallet" ? " or switch the wallet's Sepolia RPC." : "."}`;
  }
  if (text.includes("call_exception") || text.includes("missing revert data") || text.includes("bad_data")) {
    return `${prefix} could not read the verified contract runtime. ${route === "wallet" ? "Switch the wallet to the standard Ethereum Sepolia network and retry." : "Retry shortly."}`;
  }
  return `${prefix} could not complete verification. ${route === "wallet" ? "Switch to Ethereum Sepolia and retry." : "Retry shortly."}`;
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("RPC request timed out")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
