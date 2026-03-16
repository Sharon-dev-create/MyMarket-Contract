import React from "react";
import OrderCard from "./OrderCard";
import styles from "./OrdersTab.module.css";

export default function OrdersTab({
  title, subtitle, orders, account, txPending,
  onFund, onShip, onDeliver, onRefund, onClaim,
  emptyIcon = "📦", emptyTitle = "No orders yet", emptyText = "",
}) {
  return (
    <>
      <div className="page-header">
        <div className="page-title">{title}</div>
        <div className="page-sub">{subtitle}</div>
      </div>

      {orders.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">{emptyIcon}</span>
          <div className="empty-title">{emptyTitle}</div>
          {emptyText}
        </div>
      ) : (
        <div className={styles.grid}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              account={account}
              txPending={txPending}
              onFund={() => onFund(order)}
              onShip={() => onShip(order.id)}
              onDeliver={() => onDeliver(order.id)}
              onRefund={() => onRefund(order.id)}
              onClaim={() => onClaim(order.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
