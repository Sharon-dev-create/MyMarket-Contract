import { useMemo, useState } from "react";
import { type Address, zeroAddress } from "viem";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Modal } from "../components/Modal";
import { erc20Abi } from "../contracts/erc20Abi";
import { myMarketAbi } from "../contracts/myMarketAbi";
import { getChainId } from "../lib/env";
import { formatEth, formatToken, formatUsdFromCents } from "../lib/format";
import { type Product } from "../data/products";

export type OnchainOrder = {
  buyer: Address;
  seller: Address;
  amount: bigint;
  state: number; // 0 Created
  paymentType: number; // 0 ETH, 1 TOKEN
};

export function ProductCard({
  product,
  order,
  marketAddress,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  buyerAddress,
  inCart,
  onAdd,
  onRemove,
}: {
  product: Product;
  order: OnchainOrder | null;
  marketAddress: Address;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  buyerAddress?: Address;
  inCart: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const targetChainId = getChainId();
  const publicClient = usePublicClient({ chainId: targetChainId });
  const { writeContractAsync } = useWriteContract();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);

  const isListed = !!order && order.seller !== zeroAddress;
  const isAvailable =
    !!order &&
    order.state === 0 &&
    order.buyer === zeroAddress &&
    order.amount > 0n &&
    order.seller !== zeroAddress;

  const priceLabel = !order
    ? "—"
    : order.paymentType === 0
      ? `${formatEth(order.amount)} ETH`
      : `${formatToken(order.amount, tokenDecimals)} ${tokenSymbol}`;

  const usdLabel = formatUsdFromCents(product.usdPriceCents);

  const isEth = (order?.paymentType ?? 0) === 0;

  const subtitle = !order
    ? "Not listed on-chain yet"
    : order.paymentType === 0
      ? "Pay with ETH"
      : `Pay with ${tokenSymbol}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="relative">
        <img
          src={product.imageSrc}
          alt={product.title}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{product.title}</div>
              <div className="text-xs text-slate-300/80">{subtitle}</div>
            </div>
            <div className="rounded-xl bg-slate-950/70 px-3 py-2 text-right">
              <div className="text-[11px] text-slate-400">Price</div>
              <div className="text-sm font-semibold">
                {usdLabel}{" "}
                <span className="text-xs font-medium text-slate-300/70">
                  ({priceLabel})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="text-sm text-slate-300">{product.description}</div>

        {!isListed ? (
          <Card
            title="Unavailable"
            subtitle={`Seller has not listed orderId ${product.orderId} yet.`}
          >
            <div className="text-sm text-slate-400">
              Ask the seller to create an on-chain order for this product.
            </div>
          </Card>
        ) : null}

        <div className="flex gap-2">
          {inCart ? (
            <Button variant="secondary" onClick={onRemove} className="w-full">
              Remove
            </Button>
          ) : (
            <Button
              onClick={() => setIsPromptOpen(true)}
              disabled={!isAvailable}
              className="w-full"
              title={!isAvailable ? "This listing is not available to buy" : undefined}
            >
              Add to cart
            </Button>
          )}
        </div>
        {!isAvailable && isListed ? (
          <div className="text-xs text-slate-500">
            This listing is not purchasable (already funded/shipped/delivered/refunded).
          </div>
        ) : null}
      </div>

      {isPromptOpen ? (
        <Modal title="Pay to add to cart" onClose={() => setIsPromptOpen(false)}>
          <div className="space-y-4">
            <div className="text-sm text-slate-300">
              To add <span className="font-semibold">{product.title}</span> to your cart, fund the on-chain order now.
            </div>

            <Card title="Payment method">
              <div className="text-sm text-slate-300">
                {order
                  ? isEth
                    ? `This listing is configured for ETH payment: ${formatEth(order.amount)} ETH.`
                    : `This listing is configured for token payment: ${formatToken(order.amount, tokenDecimals)} ${tokenSymbol}.`
                  : "This product is not listed on-chain yet."}
              </div>
            </Card>

            <PayActions
              isEth={isEth}
              enabled={
                isAvailable && !!buyerAddress && !!publicClient && !!order && !!writeContractAsync
              }
              isPaying={isPaying}
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              buyerAddress={buyerAddress}
              marketAddress={marketAddress}
              orderId={product.orderId}
              amount={order?.amount ?? 0n}
              chainId={targetChainId}
              writeContractAsync={writeContractAsync!}
              publicClient={publicClient}
              onStatus={setPayStatus}
              onError={setPayError}
              onSuccess={() => {
                onAdd();
                setIsPromptOpen(false);
              }}
              setIsPaying={setIsPaying}
            />

            {payStatus ? <div className="text-xs text-slate-400">{payStatus}</div> : null}
            {payError ? (
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">
                {payError}
              </div>
            ) : null}
            <div className="text-[11px] text-slate-500">
              This will prompt your wallet for a transaction. After it confirms, the item is added to your local cart.
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function PayActions({
  isEth,
  enabled,
  isPaying,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  buyerAddress,
  marketAddress,
  orderId,
  amount,
  chainId,
  writeContractAsync,
  publicClient,
  onStatus,
  onError,
  onSuccess,
  setIsPaying,
}: {
  isEth: boolean;
  enabled: boolean;
  isPaying: boolean;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  buyerAddress?: Address;
  marketAddress: Address;
  orderId: number;
  amount: bigint;
  chainId: number;
  writeContractAsync: (args: unknown) => Promise<`0x${string}`>;
  publicClient: ReturnType<typeof usePublicClient>;
  onStatus: (s: string | null) => void;
  onError: (e: string | null) => void;
  onSuccess: () => void;
  setIsPaying: (v: boolean) => void;
}) {
  const allowance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    chainId,
    args: [buyerAddress ?? zeroAddress, marketAddress],
    query: { enabled: enabled && !isEth && tokenAddress !== zeroAddress },
  });

  const needsApproval = useMemo(() => {
    if (isEth) return false;
    const current = (allowance.data as bigint | undefined) ?? 0n;
    return current < amount;
  }, [allowance.data, amount, isEth]);

  async function pay() {
    if (!enabled) return;
    if (!publicClient) return;
    onError(null);
    setIsPaying(true);
    try {
      if (!isEth && needsApproval) {
        onStatus(`Approving ${tokenSymbol}…`);
        const approveHash = await writeContractAsync({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          chainId,
          args: [marketAddress, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      onStatus(isEth ? "Funding with ETH…" : `Funding with ${tokenSymbol}…`);
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: myMarketAbi,
        functionName: isEth ? "depositEth" : "depositToken",
        chainId,
        args: [BigInt(orderId)],
        value: isEth ? amount : undefined,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      onStatus("Payment confirmed.");
      onSuccess();
    } catch (e) {
      onStatus(null);
      onError((e as Error).message ?? String(e));
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {!isEth ? (
        <Button
          variant="secondary"
          onClick={() => void pay()}
          disabled={!enabled || isPaying}
          className="w-full"
          title={needsApproval ? "This will include approval + payment" : "Already approved; payment will run"}
        >
          {needsApproval
            ? `Pay (approve + deposit ${formatToken(amount, tokenDecimals)} ${tokenSymbol})`
            : `Pay (deposit ${formatToken(amount, tokenDecimals)} ${tokenSymbol})`}
        </Button>
      ) : (
        <Button onClick={() => void pay()} disabled={!enabled || isPaying} className="w-full">
          Pay {formatEth(amount)} ETH
        </Button>
      )}
      {!enabled ? (
        <div className="text-xs text-slate-500">
          Connect wallet and ensure this product is listed and available.
        </div>
      ) : null}
    </div>
  );
}
