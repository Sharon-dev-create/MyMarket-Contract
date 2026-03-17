import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Layout } from "../components/Layout";
import { getChainId } from "../lib/env";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, chainId } = useAccount();
  const { connect, isPending, error } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const targetChainId = getChainId();
  const from = (location.state as { from?: string } | null)?.from ?? "/shop";
  const isWrongNetwork = isConnected && chainId !== undefined && chainId !== targetChainId;

  useEffect(() => {
    if (isConnected) navigate(from, { replace: true });
  }, [from, isConnected, navigate]);

  return (
    <Layout>
      <div className="mx-auto max-w-xl">
        <Card
          title="Connect your wallet"
          subtitle="Login to browse listings and fund an order."
        >
          <div className="space-y-3">
            <Button
              onClick={() => connect({ connector: injected() })}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Connecting…" : "Connect (Injected / MetaMask)"}
            </Button>
            {isConnected ? (
              <Button
                variant={isWrongNetwork ? "primary" : "secondary"}
                onClick={() => switchChain?.({ chainId: targetChainId })}
                disabled={!switchChain || isSwitching || !isWrongNetwork}
                className="w-full"
              >
                {isSwitching
                  ? "Switching…"
                  : isWrongNetwork
                    ? `Switch to chainId ${targetChainId}`
                    : "Network OK"}
              </Button>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">
                {error.message}
              </div>
            ) : null}
            {isWrongNetwork ? (
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-sm text-amber-200">
                Wallet is on chainId {chainId}, but the app targets chainId {targetChainId}.
              </div>
            ) : null}
            <div className="text-xs text-slate-500">
              Tip: set `VITE_MYMARKET_ADDRESS` in `frontend/.env.local`.
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
