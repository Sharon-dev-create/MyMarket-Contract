import React from "react";
import styles from "./ToastContainer.module.css";

const ICONS = { success: "✓", error: "✗", info: "ℹ" };

export default function ToastContainer({ toasts }) {
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          {ICONS[t.type]}&nbsp;{t.msg}
        </div>
      ))}
    </div>
  );
}
