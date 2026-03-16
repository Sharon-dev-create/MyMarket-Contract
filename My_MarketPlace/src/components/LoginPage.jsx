import React from "react";
import styles from "./LoginPage.module.css";

const FEATURES = [
  ["🛡️", "Escrow Protected", "Funds locked until you confirm delivery"],
  ["⚡", "ETH or Token",     "Pay with ETH or ERC-20 — your choice"],
  ["↩️", "Refund Anytime",   "Cancel before shipping for a full refund"],
  ["⏱️", "Auto-Release",     "7-day timeout auto-releases to seller"],
];

export default function LoginPage({ onConnect }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.grid} />
      <div className={styles.card}>

        <div className={styles.badge}>
          <span className={styles.dot} />
          On-Chain Escrow Market
        </div>

        <h1 className={styles.heading}>
          Shop. Pay.<br />Own it on-chain.
        </h1>
        <p className={styles.sub}>
          Browse real products, pay with ETH or tokens,<br />
          and every purchase is protected by smart contract escrow.
        </p>

        <button className={styles.connectBtn} onClick={onConnect}>
          🦊&nbsp;&nbsp;Connect MetaMask to Shop
        </button>

        <div className={styles.features}>
          {FEATURES.map(([icon, name, desc]) => (
            <div className={styles.feature} key={name}>
              <span className={styles.featureIcon}>{icon}</span>
              <span className={styles.featureName}>{name}</span>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <p className={styles.mmNote}>
          No MetaMask?&nbsp;
          <a href="https://metamask.io" target="_blank" rel="noreferrer">
            Install it here →
          </a>
        </p>

      </div>
    </div>
  );
}
