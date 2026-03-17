import { Link } from "react-router-dom";
import { type ReactNode } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { AddressPill } from "./AddressPill";
import { Button } from "./Button";

export function Layout({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-900 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/shop" className="text-base font-bold tracking-tight">
              MyMarket
            </Link>
            <span className="text-xs text-slate-500">Buyer</span>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && address ? <AddressPill address={address} /> : null}
            {isConnected ? (
              <Button variant="ghost" onClick={() => disconnect()}>
                Disconnect
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
