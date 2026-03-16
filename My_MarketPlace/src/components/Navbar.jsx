 import React from "react";
import { shortAddr } from "../utils";
import styles from "./Navbar.module.css";

const TABS = [
  ["shop",   "Shop"],
  ["orders", "My Orders"],
  ["all",    "All Orders"],
];

export default function Navbar({ account, tab, setTab, cartCount, onCartClick, onDisconnect }) {
  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <div className={styles.icon}>🛒</div>
        MyMarket
      </div>

      {TABS.map(([id, label]) => (
        <button
          key={id}
          className={`${styles.tab} ${tab === id ? styles.active : ""}`}
          onClick={() => setTab(id)}
        >
          {label}
        </button>
      ))}

      <div className={styles.spacer} />

      <button className={styles.cartBtn} onClick={onCartClick}>
        🛍️ Cart
        {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
      </button>

      <div className={styles.addrChip}>
        <span className={styles.addrDot} />
        {shortAddr(account)}
      </div>

      <button className={styles.discBtn} onClick={onDisconnect}>
        Disconnect
      </button>
    </nav>
  );
}
