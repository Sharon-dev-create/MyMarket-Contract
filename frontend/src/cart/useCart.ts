import { useCallback, useEffect, useMemo, useState } from "react";

const storageKey = "mymarket.cart.v1";

function parseStored(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => Number.isInteger(x) && x >= 0) as number[];
  } catch {
    return [];
  }
}

export function useCart() {
  const [orderIds, setOrderIds] = useState<number[]>(() =>
    parseStored(localStorage.getItem(storageKey)),
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(orderIds));
  }, [orderIds]);

  const add = useCallback((orderId: number) => {
    setOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  }, []);

  const remove = useCallback((orderId: number) => {
    setOrderIds((prev) => prev.filter((id) => id !== orderId));
  }, []);

  const clear = useCallback(() => setOrderIds([]), []);

  const count = orderIds.length;
  const set = useMemo(() => new Set(orderIds), [orderIds]);

  return { orderIds, set, count, add, remove, clear };
}

