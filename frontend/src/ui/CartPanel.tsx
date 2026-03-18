import { type Address } from "viem";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
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

function stateLabel(state: number) {
  switch (state) {
    case 0:
      return "Created";
    case 1:
      return "Funded";
    case 2:
      return "Shipped";
    case 3:
      return "Delivered";
    case 4:
      return "Refunded";
    default:
      return `State ${state}`;
  }
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
  const ethTotal = orders
    .filter((o) => o.paymentType === 0)
    .reduce((acc, o) => acc + o.amount, 0n);
  const tokenTotal = orders
    .filter((o) => o.paymentType === 1)
    .reduce((acc, o) => acc + o.amount, 0n);
  const usdTotalCents = orders.reduce((acc, o) => acc + o.product.usdPriceCents, 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Cart</div>
          <div className="text-sm text-slate-400">
            {orders.length} item{orders.length === 1 ? "" : "s"}
          </div>
        </div>
        <Button variant="ghost" onClick={onClear} disabled={orders.length === 0}>
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
                    · {stateLabel(o.state)}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onRemove(o.orderId)}
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
          <div className="text-[11px] text-slate-500">
            “Add to cart” triggers payment first, then stores the item in your local cart for tracking.
          </div>
        </div>
      )}
    </div>
  );
}
