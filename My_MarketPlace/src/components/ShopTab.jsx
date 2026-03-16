import React, { useState } from "react";
import { PRODUCTS, CATEGORIES } from "../constants";
import ProductCard from "./ProductCard";
import CartPanel from "./CartPanel";
import styles from "./ShopTab.module.css";

export default function ShopTab({
  cart, cartCount, ethTotal, tokenTotal,
  cartQty, onAdd, onSetQty, onRemove, onClear,
  onCheckout, txPending,
}) {
  const [catFilter, setCatFilter] = useState("All");
  const [search,    setSearch]    = useState("");

  const filtered = PRODUCTS.filter((p) => {
    const matchCat    = catFilter === "All" || p.category === catFilter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-title">Browse Products</div>
        <div className="page-sub">Add items to your cart — each creates an on-chain escrow order</div>
      </div>

      <div className={styles.layout}>
        {/* Left — product grid */}
        <div>
          <div className={styles.filterBar}>
            <input
              className={styles.search}
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${catFilter === cat ? styles.active : ""}`}
                onClick={() => setCatFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">🔍</span>
              <div className="empty-title">No products found</div>
              Try a different search or category
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={cartQty(p.id)}
                  onAdd={onAdd}
                  onSetQty={onSetQty}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — cart sidebar */}
        <CartPanel
          cart={cart}
          cartCount={cartCount}
          ethTotal={ethTotal}
          tokenTotal={tokenTotal}
          onRemove={onRemove}
          onCheckout={onCheckout}
          onClear={onClear}
          txPending={txPending}
        />
      </div>
    </>
  );
}
