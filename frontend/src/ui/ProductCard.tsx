import { type Address, zeroAddress } from "viem";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
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
  tokenSymbol,
  tokenDecimals,
  inCart,
  onAdd,
  onRemove,
}: {
  product: Product;
  order: OnchainOrder | null;
  tokenSymbol: string;
  tokenDecimals: number;
  inCart: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
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
              onClick={onAdd}
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
    </div>
  );
}
