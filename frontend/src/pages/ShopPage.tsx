import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { type Address, zeroAddress } from "viem";
import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { myMarketAbi } from "../contracts/myMarketAbi";
import { erc20Abi } from "../contracts/erc20Abi";
import { getChainId, getMarketAddress } from "../lib/env";
import { products } from "../data/products";
import { useCart } from "../cart/useCart";
import { CartPanel, type CartOrder } from "../ui/CartPanel";
import { ProductCard, type OnchainOrder } from "../ui/ProductCard";

type OrderTuple = readonly [Address, Address, bigint, bigint, bigint, bigint];

function asOrderTuple(value: unknown): OrderTuple | null {
  if (!Array.isArray(value) || value.length !== 6) return null;
  const [buyer, seller, amount, state, shippedAt, paymentType] = value as unknown[];
  if (typeof buyer !== "string" || typeof seller !== "string") return null;
  if (typeof amount !== "bigint") return null;
  if (typeof state !== "bigint") return null;
  if (typeof shippedAt !== "bigint") return null;
  if (typeof paymentType !== "bigint") return null;
  return [buyer as Address, seller as Address, amount, state, shippedAt, paymentType];
}

export function ShopPage() {
  const targetChainId = getChainId();
  const cart = useCart();
  const marketAddressResult = useMemo(() => {
    try {
      return { address: getMarketAddress() as Address, error: null as string | null };
    } catch (e) {
      return { address: null as Address | null, error: (e as Error).message ?? String(e) };
    }
  }, []);

  const { address: buyerAddress } = useAccount();

  if (!marketAddressResult.address) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl">
          <Card
            title="Frontend not configured"
            subtitle="Set your deployed contract address in `frontend/.env.local`."
          >
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">
              {marketAddressResult.error}
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  const marketAddress = marketAddressResult.address;

  const paymentToken = useReadContract({
    address: marketAddress,
    abi: myMarketAbi,
    functionName: "PAYMENT_TOKEN",
    chainId: targetChainId,
  });

  const tokenAddress = (paymentToken.data ?? zeroAddress) as Address;

  const tokenMeta = useReadContracts({
    contracts: tokenAddress === zeroAddress ? [] : [
      { address: tokenAddress, abi: erc20Abi, functionName: "symbol" as const, chainId: targetChainId },
      { address: tokenAddress, abi: erc20Abi, functionName: "decimals" as const, chainId: targetChainId }
    ],
    query: { enabled: tokenAddress !== zeroAddress }
  });

  const tokenSymbol = (tokenMeta.data?.[0]?.result as string | undefined) ?? "TOKEN";
  const tokenDecimals = Number((tokenMeta.data?.[1]?.result as bigint | undefined) ?? 18n);

  const count = useReadContract({
    address: marketAddress,
    abi: myMarketAbi,
    functionName: "orderCount",
    chainId: targetChainId,
  });

  const orderCount = Number(count.data ?? 0n);

  const missingOnchainListings = products.filter((p) => p.orderId >= orderCount).length;

  const productOrderContracts = useMemo(() => {
    const ids = products
      .map((p) => p.orderId)
      .filter((id) => id >= 0 && id < orderCount);
    return ids.map((id) => ({
      address: marketAddress,
      abi: myMarketAbi,
      functionName: "orders" as const,
      chainId: targetChainId,
      args: [BigInt(id)] as const,
    }));
  }, [marketAddress, orderCount, targetChainId]);

  const orders = useReadContracts({
    contracts: productOrderContracts,
    query: { enabled: productOrderContracts.length > 0 },
  });

  const ordersById = useMemo(() => {
    const raw = orders.data ?? [];
    const ids = products
      .map((p) => p.orderId)
      .filter((id) => id >= 0 && id < orderCount);
    const map = new Map<number, OnchainOrder>();
    for (let i = 0; i < raw.length; i++) {
      const tuple = asOrderTuple(raw[i]?.result);
      const orderId = ids[i];
      if (!tuple || orderId === undefined) continue;
      const [buyer, seller, amount, state, , paymentType] = tuple;
      map.set(orderId, {
        buyer,
        seller,
        amount,
        state: Number(state),
        paymentType: Number(paymentType),
      });
    }
    return map;
  }, [orderCount, orders.data]);

  const cartOrders: CartOrder[] = useMemo(() => {
    const out: CartOrder[] = [];
    for (const orderId of cart.orderIds) {
      const product = products.find((p) => p.orderId === orderId);
      const order = ordersById.get(orderId);
      if (!product || !order) continue;
      out.push({
        orderId,
        product,
        buyer: order.buyer,
        seller: order.seller,
        amount: order.amount,
        state: order.state,
        paymentType: order.paymentType,
      });
    }
    return out;
  }, [cart.orderIds, ordersById]);

  return (
    <Layout>
      <div className="space-y-6">
        <Card
          title="Products"
          subtitle="Add a product to your cart, then checkout to fund the on-chain order."
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  order={product.orderId < orderCount ? (ordersById.get(product.orderId) ?? null) : null}
                  tokenSymbol={tokenSymbol}
                  tokenDecimals={tokenDecimals}
                  inCart={cart.set.has(product.orderId)}
                  onAdd={() => cart.add(product.orderId)}
                  onRemove={() => cart.remove(product.orderId)}
                />
              ))}
            </div>
            <div className="lg:col-span-1">
              <CartPanel
                marketAddress={marketAddress}
                tokenAddress={tokenAddress}
                tokenSymbol={tokenSymbol}
                tokenDecimals={tokenDecimals}
                buyerAddress={buyerAddress}
                orders={cartOrders}
                onRemove={cart.remove}
                onClear={cart.clear}
              />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Products are backed by on-chain `orderId`s. If a product shows “Not listed on-chain yet”, the seller needs
            to create that order first.
          </div>
          {missingOnchainListings > 0 ? (
            <div className="mt-2 text-xs text-slate-500">
              Tip: create at least {missingOnchainListings} more on-chain order(s) to list all products.
            </div>
          ) : null}
        </Card>
      </div>
    </Layout>
  );
}
