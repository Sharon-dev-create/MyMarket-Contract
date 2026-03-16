import React from "react";
import styles from "./CheckoutModal.module.css";

export default function CheckoutModal({ cart, cartCount, onConfirm, onClose, txPending }) {
  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.title}>Confirm Checkout</div>
        <div className={styles.sub}>Each item creates a separate escrow order on-chain</div>

        <div className={styles.items}>
          {cart.map(({ product, qty }) => (
            <div className={styles.item} key={product.id}>
              <div className={styles.itemLeft}>
                <span>{product.emoji}</span>
                <span>
                  {product.name}
                  {qty > 1 && <span className={styles.qty}> ×{qty}</span>}
                </span>
              </div>
              <span className={styles.itemPrice}>
                {(product.price * qty).toFixed(4)} {product.paymentType}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.total}>
          <span>Total orders to create</span>
          <span>{cartCount}</span>
        </div>

        <p className={styles.note}>
          This will submit {cartCount} transaction{cartCount > 1 ? "s" : ""} — one per item quantity.
          After creation, fund each order to complete your purchase.
        </p>

        <div className={styles.btns}>
          <button className={styles.cancel} onClick={onClose}>Cancel</button>
          <button className={styles.confirm} onClick={onConfirm} disabled={txPending}>
            {txPending
              ? <><span className="spinner" />&nbsp;Processing…</>
              : `Create ${cartCount} Order${cartCount > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
