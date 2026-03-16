import React from "react";
import styles from "./StatsBar.module.css";

export default function StatsBar({ stats }) {
  return (
    <div className={styles.row}>
      {stats.map(([label, value, color]) => (
        <div className={styles.card} key={label}>
          <div className={styles.label}>{label}</div>
          <div className={styles.value} style={{ color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
