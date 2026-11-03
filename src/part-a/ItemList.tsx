// R8: the products in a subscription. Images are decorative (alt=""), because the name is right next to them.
import { useState } from "react";
import type { SubscriptionItem } from "../api/types";
import styles from "./SubscriptionCard.module.css";

/** A capsule, for products without an image. Same box as a real thumbnail, so the rows line up. */
function Placeholder() {
  return (
    <span className={`${styles.thumb} ${styles["thumb--placeholder"]}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <g transform="rotate(-45 12 12)">
          <rect x="3" y="8.5" width="18" height="7" rx="3.5" />
          <path d="M12 8.5v7" />
        </g>
      </svg>
    </span>
  );
}

/** Falls back to the placeholder when the image fails to load. Keyed by URL, so a new URL gets a fresh try. */
function Thumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Placeholder />;
  return <img className={styles.thumb} src={src} alt="" width={64} height={64} onError={() => setFailed(true)} />;
}

export function ItemList({ items }: { items: SubscriptionItem[] }) {
  if (items.length === 0) return <p>There are no products in this subscription.</p>;
  return (
    <ul className={styles.items}>
      {items.map((item) => (
        <li key={item.sku} className={styles.item}>
          {item.imageUrl ? <Thumbnail key={item.imageUrl} src={item.imageUrl} /> : <Placeholder />}
          <div className={styles.item__text}>
            <p className={styles.item__name}>{item.name}</p>
            <p className={styles.muted}>Quantity: {item.quantity}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
