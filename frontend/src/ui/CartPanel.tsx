import { useMemo, useState } from "react";
import { type Address, zeroAddress } from "viem";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { erc20Abi } from "../contracts/erc20Abi";
import { myMarketAbi } from "../contracts/myMarketAbi";
import { getChainId } from "../lib/env";
import { formatEth, formatToken, formatUsdFromCents } from "../lib/format";
import { type Product } from "../data/products";

export type CartOrder = {
  orderId: number;
  product: Product;
  buyer: Address;
  seller: Address;
  amount: bigint;
  state: number;
  paymentType: number; // 0 ETH, 1 TOKEN
};

function isPurchasable(o: CartOrder) {
  return (
    o.seller !== zeroAddress &&
    o.buyer === zeroAddress &&
    o.state === 0 &&
    o.amount > 0n
  );
}

export function CartPanel({
  marketAddress,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  buyerAddress,
  orders,
  onRemove,
  onClear,
}: {
  marketAddress: Address;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  buyerAddress?: Address;
  orders: CartOrder[];
  onRemove: (orderId: number) => void;
  onClear: () => void;
}) {
  const targetChainId = getChainId();
  const publicClient = usePublicClient({ chainId: targetChainId });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const purchasable = orders.filter(isPurchasable);
  const ethOrders = purchasable.filter((o) => o.paymentType === 0);
  const tokenOrders = purchasable.filter((o) => o.paymentType === 1);

  const ethTotal = ethOrders.reduce((acc, o) => acc + o.amount, 0n);
  const tokenTotal = tokenOrders.reduce((acc, o) => acc + o.amount, 0n);
  const usdTotalCents = orders.reduce((acc, o) => acc + o.product.usdPriceCents, 0);

  const allowance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    chainId: targetChainId,
    args: [buyerAddress ?? zeroAddress, marketAddress],
    query: { enabled: tokenOrders.length > 0 && !!buyerAddress && tokenAddress !== zeroAddress },
  });

  const needsApproval = useMemo(() => {
    if (tokenOrders.length === 0) return false;
    const current = (allowance.data as bigint | undefined) ?? 0n;
    return current < tokenTotal;
  }, [allowance.data, tokenOrders.length, tokenTotal]);

  const disabledReason =
    !buyerAddress
      ? "Connect wallet"
      : purchasable.length === 0
        ? "No purchasable items"
        : !publicClient
          ? "No RPC client"
          : null;

  async function checkout() {
    if (disabledReason) return;
    if (!publicClient) return;
    if (!buyerAddress) return;

    setError(null);
    setIsCheckingOut(true);
    try {
      if (tokenOrders.length > 0 && needsApproval) {
        setStatus(`Approving ${tokenSymbol}…`);
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          chainId: targetChainId,
          args: [marketAddress, tokenTotal],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      for (const o of tokenOrders) {
        setStatus(`Funding token order #${o.orderId}…`);
        const hash = await writeContractAsync({
          address: marketAddress,
          abi: myMarketAbi,
          functionName: "depositToken",
          chainId: targetChainId,
          args: [BigInt(o.orderId)],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      for (const o of ethOrders) {
        setStatus(`Funding ETH order #${o.orderId}…`);
        const hash = await writeContractAsync({
          address: marketAddress,
          abi: myMarketAbi,
          functionName: "depositEth",
          chainId: targetChainId,
          args: [BigInt(o.orderId)],
          value: o.amount,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStatus("Checkout complete.");
      onClear();
    } catch (e) {
      setError((e as Error).message ?? String(e));
      setStatus(null);
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Cart</div>
          <div className="text-sm text-slate-400">
            {orders.length} item{orders.length === 1 ? "" : "s"}
          </div>
        </div>
        <Button variant="ghost" onClick={onClear} disabled={orders.length === 0 || isCheckingOut}>
          Clear
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-sm text-slate-400">Add a product to start checkout.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const price =
              o.paymentType === 0
                ? `${formatEth(o.amount)} ETH`
                : `${formatToken(o.amount, tokenDecimals)} ${tokenSymbol}`;
            const ok = isPurchasable(o);
            return (
              <div
                key={o.orderId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-900 bg-slate-950 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{o.product.title}</div>
                  <div className="text-xs text-slate-500">
                    #{o.orderId} · {formatUsdFromCents(o.product.usdPriceCents)}{" "}
                    <span className="text-[11px] text-slate-500/80">({price})</span>{" "}
                    {ok ? "" : "· not purchasable"}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onRemove(o.orderId)}
                  disabled={isCheckingOut}
                >
                  Remove
                </Button>
              </div>
            );
          })}

          <Card title="Total">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-400">USD</div>
              <div className="font-semibold">{formatUsdFromCents(usdTotalCents)}</div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-400">ETH</div>
              <div className="font-semibold">{formatEth(ethTotal)} ETH</div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <div className="text-slate-400">{tokenSymbol}</div>
              <div className="font-semibold">{formatToken(tokenTotal, tokenDecimals)} {tokenSymbol}</div>
            </div>
          </Card>

          <Button
            onClick={() => void checkout()}
            disabled={!!disabledReason || isCheckingOut}
            className="w-full"
            title={disabledReason ?? undefined}
          >
            {isCheckingOut ? "Checkout in progress…" : "Checkout (fund orders)"}
          </Button>

          {status ? <div className="text-xs text-slate-400">{status}</div> : null}
          {error ? (
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <div className="text-[11px] text-slate-500">
            Checkout sends multiple transactions (one per order). The contract can’t take a single “cart total” payment.
          </div>
        </div>
      )}
    </div>
  );
}
