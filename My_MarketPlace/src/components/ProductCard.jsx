import React from "react";
import { priceLabel } from "../utils";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product, qty, onAdd, onSetQty }) {
  return (
    <div className={`${styles.card} ${qty > 0 ? styles.inCart : ""}`}>
      <span className={styles.emoji}>{product.emoji}</span>
      <div className={styles.name}>{product.name}</div>
      <div className={styles.desc}>{product.desc}</div>

      <div className={styles.footer}>
        <div className={styles.price}>{priceLabel(product)}</div>
        <div className={styles.cat}>{product.category}</div>
      </div>

      <div className={`${styles.stock} ${product.stock <= 10 ? styles.low : ""}`}>
        {product.stock <= 10
          ? `⚠️ Only ${product.stock} left`
          : `✓ ${product.stock} in stock`}
      </div>

      {qty === 0 ? (
        <button className={styles.addBtn} onClick={() => onAdd(product)}>
          + Add to Cart
        </button>
      ) : (
        <div className={styles.qtyControl}>
          <button className={styles.qtyBtn} onClick={() => onSetQty(product.id, qty - 1)}>−</button>
          <div className={styles.qtyNum}>{qty}</div>
          <button className={styles.qtyBtn} onClick={() => onSetQty(product.id, qty + 1)}>+</button>
        </div>
      )}
    </div>
  );
}
