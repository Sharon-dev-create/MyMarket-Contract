import starterImg from "../assets/products/starter.svg";
import proImg from "../assets/products/pro.svg";
import limitedImg from "../assets/products/limited.svg";
import collectorImg from "../assets/products/collector.svg";

export type Product = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  orderId: number;
  usdPriceCents: number;
};

// IMPORTANT:
// The contract does not store product metadata. We treat each on-chain `orderId`
// as the backing “listing” for a product card.
//
// Seller must create these orders on-chain (matching `orderId`) for the products
// to be purchasable.
export const products: Product[] = [
  {
    id: "starter",
    title: "Starter Pack",
    description: "A simple listing to test the escrow purchase flow.",
    imageSrc: starterImg,
    orderId: 0,
    usdPriceCents: 1900,
  },
  {
    id: "pro",
    title: "Pro Bundle",
    description: "A bigger bundle backed by an on-chain listing.",
    imageSrc: proImg,
    orderId: 1,
    usdPriceCents: 4900,
  },
  {
    id: "limited",
    title: "Limited Drop",
    description: "A limited item — pay once, fund the escrow, done.",
    imageSrc: limitedImg,
    orderId: 2,
    usdPriceCents: 2900,
  },
  {
    id: "collector",
    title: "Collector Item",
    description: "Escrow-backed order with a 7 day timeout after shipping.",
    imageSrc: collectorImg,
    orderId: 3,
    usdPriceCents: 9900,
  },
];
