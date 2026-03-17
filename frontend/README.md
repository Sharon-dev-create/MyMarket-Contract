# MyMarket Frontend (React + Tailwind)

Buyer flow:
- Connect wallet on `/login`
- Browse products on `/shop`
- Add products to cart
- Checkout funds the underlying on-chain order(s) with ETH or ERC-20 (depends on each order’s `paymentType`)

## Prereqs
- Node.js 20.19+ (recommended) and npm

## Configure
Copy the example env and set your deployed contract address:

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:
- `VITE_MYMARKET_ADDRESS` (required)
- `VITE_CHAIN_ID` (optional, defaults to Sepolia `11155111`)
- `VITE_RPC_URL` (optional; set to your RPC for reliability)

## Run
```bash
cd frontend
npm install
npm run dev
```

## Products / Listings
Products are defined in `frontend/src/data/products.ts`. Each product has:
- a local image
- a display USD price (UI only)
- an `orderId` that must exist on-chain

This contract does not store product metadata, so the frontend treats each product as “backed by” an on-chain `orders(orderId)` entry. If the seller has not created that `orderId` yet, the product will show as unavailable.

## Checkout behavior
- If your cart contains token-based items, checkout may prompt an `approve()` first.
- Checkout sends multiple transactions (one per order). The contract does not support paying a single “cart total” in one call.

## Notes
- Sellers must create listings (orders) on-chain (e.g. with Foundry) before buyers can purchase.
