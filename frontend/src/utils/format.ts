export function formatTokenAmount(
  value: string | bigint,
  decimals: number,
  maximumFractionDigits = 2
): string {
  const amount = BigInt(value);
  const sign = amount < 0n ? "-" : "";
  const absoluteAmount = amount < 0n ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = (absoluteAmount / base).toString();
  const fraction = decimals > 0
    ? (absoluteAmount % base).toString().padStart(decimals, "0")
    : "";
  const groupedWhole = sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmedFraction = fraction.slice(0, maximumFractionDigits).replace(/0+$/, "");
  return trimmedFraction ? `${groupedWhole}.${trimmedFraction}` : groupedWhole;
}

export function shortenHex(value: string, leading = 6, trailing = 4): string {
  if (value.length <= leading + trailing) return value;
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}
