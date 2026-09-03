import { formatUnits } from "ethers";

export function formatTokenAmount(
  value: string | bigint,
  decimals: number,
  maximumFractionDigits = 2
): string {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmedFraction = fraction.slice(0, maximumFractionDigits).replace(/0+$/, "");
  return trimmedFraction ? `${groupedWhole}.${trimmedFraction}` : groupedWhole;
}

export function shortenHex(value: string, leading = 6, trailing = 4): string {
  if (value.length <= leading + trailing) return value;
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}
