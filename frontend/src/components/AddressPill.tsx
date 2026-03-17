import { type Address } from "viem";

function shortenAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AddressPill({ address }: { address: Address }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-200">
      {shortenAddress(address)}
    </span>
  );
}

