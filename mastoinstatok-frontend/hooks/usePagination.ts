import { useState, useRef, useCallback } from "react";

export function usePagination<T>(
  fetchFn: (offset: number) => Promise<{ items: T[]; nextOffset: number }>,
  initialOffset = 0
) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const fetchNext = useCallback(async () => {
    if (isLoadingRef.current || offset === -1) return;
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { items: newItems, nextOffset } = await fetchFn(offset);
      const newItemsState = offset === 0 ? newItems : [...items, ...newItems];
      setItems((prev) => [...new Set(newItemsState)]);
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setOffset(-1);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetchFn, offset]);

  const reset = () => {
    setItems([]);
    setOffset(initialOffset);
    setError(null);
  };

  return { items, setItems, loading, error, offset, fetchNext, reset };
}