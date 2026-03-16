import React from "react";
import { priceLabel } from "../utils";
import styles from "./CartPanel.module.css";

export default function CartPanel({
  cart, cartCount, ethTotal, tokenTotal,
  onRemove, onCheckout, onClear, txPending,
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        🛍️ Cart
        <span className={styles.count}>({cartCount} item{cartCount !== 1 ? "s" : ""})</span>
      </div>

      {cart.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🛒</span>
          Your cart is empty.<br />Add products to get started.
        </div>
      ) : (
        <>
          {cart.map(({ product, qty }) => (
            <div className={styles.item} key={product.id}>
              <span className={styles.itemEmoji}>{product.emoji}</span>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{product.name}</div>
                <div className={styles.itemMeta}>
                  {qty} × {priceLabel(product)}
                  {qty > 1 && (
                    <span className={styles.itemSubtotal}>
                      &nbsp;= {(product.price * qty).toFixed(4)} {product.paymentType}
                    </span>
                  )}
                </div>
              </div>
              <button className={styles.removeBtn} onClick={() => onRemove(product.id)}>✕</button>
            </div>
          ))}

          <div className={styles.summary}>
            {ethTotal   > 0 && <div className={styles.row}><span>ETH subtotal</span><span>{ethTotal.toFixed(4)} ETH</span></div>}
            {tokenTotal > 0 && <div className={styles.row}><span>Token subtotal</span><span>{tokenTotal.toFixed(2)} TKN</span></div>}
            <div className={`${styles.row} ${styles.total}`}>
              <span>Orders to create</span>
              <span>{cartCount}</span>
            </div>
            <p className={styles.note}>
              Each item qty creates a separate on-chain escrow order. Gas fee applies per transaction.
            </p>
          </div>

          <button
            className={styles.checkoutBtn}
            onClick={onCheckout}
            disabled={txPending}
          >
            Checkout — {cartCount} order{cartCount !== 1 ? "s" : ""}
          </button>
          <button className={styles.clearBtn} onClick={onClear}>Clear cart</button>
        </>
      )}
    </div>
  );
}
