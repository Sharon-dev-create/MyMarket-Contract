import { type Address, isAddress } from "viem";

function mustGetEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(`Missing ${key}. Set it in .env.local (see .env.example).`);
  }
  return value;
}

export function getMarketAddress(): Address {
  const raw = mustGetEnv("VITE_MYMARKET_ADDRESS");
  if (!isAddress(raw)) {
    throw new Error(`Invalid VITE_MYMARKET_ADDRESS: ${raw}`);
  }
  return raw;
}

export function getChainId(): number {
  const raw = (import.meta.env.VITE_CHAIN_ID as string | undefined) ?? "11155111";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 11155111;
  return parsed;
}

export function getRpcUrl(): string | undefined {
  const raw = import.meta.env.VITE_RPC_URL as string | undefined;
  return raw && raw.trim().length > 0 ? raw : undefined;
}

