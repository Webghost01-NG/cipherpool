const DECIMAL_AMOUNT_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("Token decimals are invalid.");
  }

  const normalized = value.trim();
  if (!DECIMAL_AMOUNT_PATTERN.test(normalized)) {
    throw new Error("Enter a valid decimal amount.");
  }

  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`);
  }

  const base = 10n ** BigInt(decimals);
  const wholeValue = BigInt(whole || "0") * base;
  const fractionValue = BigInt((fraction || "0").padEnd(decimals, "0"));
  return wholeValue + fractionValue;
}
