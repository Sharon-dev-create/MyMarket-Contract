import React from "react";
import { shortAddr, fmtEther, canClaimTimeout } from "../utils";
import { STATE_COLOR } from "../constants";
import styles from "./OrderCard.module.css";

export default function OrderCard({
  order, account, txPending,
  onFund, onShip, onDeliver, onRefund, onClaim,
}) {
  const isBuyer  = order.buyer?.toLowerCase()  === account?.toLowerCase();
  const isSeller = order.seller?.toLowerCase() === account?.toLowerCase();
  const sc       = STATE_COLOR[order.state] || STATE_COLOR.Created;
  const amount   = fmtEther(order.amount) + (order.paymentType === "ETH" ? " ETH" : " TKN");
  const canClaim = canClaimTimeout(order);

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.id}>
          Order <span className={styles.idNum}>#{order.id}</span>
        </div>
        <div
          className={styles.badge}
          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
        >
          {order.state}
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.lbl}>Amount</span>
        <span className={styles.val} style={{ color: "#60a5fa" }}>{amount}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.lbl}>Payment</span>
        <span className={styles.val}>{order.paymentType}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.lbl}>Seller</span>
        <span className={styles.val}>
          {shortAddr(order.seller)}
          {isSeller && <span className={styles.you}> (you)</span>}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.lbl}>Buyer</span>
        <span className={styles.val}>
          {order.buyer === "0x0000000000000000000000000000000000000000"
            ? <span className={styles.none}>—</span>
            : <>
                {shortAddr(order.buyer)}
                {isBuyer && <span className={styles.you}> (you)</span>}
              </>}
        </span>
      </div>

      <div className={styles.actions}>
        {order.state === "Created" && !isSeller && (
          <button className={`${styles.btn} ${styles.primary}`} onClick={onFund} disabled={txPending}>
            Fund Order
          </button>
        )}
        {order.state === "Funded" && isSeller && (
          <button className={`${styles.btn} ${styles.primary}`} onClick={onShip} disabled={txPending}>
            Mark Shipped
          </button>
        )}
        {order.state === "Funded" && isBuyer && (
          <button className={`${styles.btn} ${styles.danger}`} onClick={onRefund} disabled={txPending}>
            Refund
          </button>
        )}
        {order.state === "Shipped" && isBuyer && (
          <button className={`${styles.btn} ${styles.primary}`} onClick={onDeliver} disabled={txPending}>
            Confirm Delivery
          </button>
        )}
        {canClaim && isSeller && (
          <button className={styles.btn} onClick={onClaim} disabled={txPending}>
            Claim (7d timeout)
          </button>
        )}
      </div>
    </div>
  );
}
