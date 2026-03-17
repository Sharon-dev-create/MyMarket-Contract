import { formatEther, formatUnits } from "viem";

export function formatEth(value: bigint) {
  const asString = formatEther(value);
  const [whole, frac = ""] = asString.split(".");
  return frac.length > 4 ? `${whole}.${frac.slice(0, 4)}` : asString;
}

export function formatToken(value: bigint, decimals: number) {
  const asString = formatUnits(value, decimals);
  const [whole, frac = ""] = asString.split(".");
  return frac.length > 4 ? `${whole}.${frac.slice(0, 4)}` : asString;
}

export function formatUsdFromCents(cents: number) {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.trunc(cents)) : 0;
  const dollars = (safe / 100).toFixed(2);
  return `$${dollars}`;
}
