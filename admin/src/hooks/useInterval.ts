import { useEffect, useRef } from 'react';

// Ref-based so `callback` can close over fresh state/props every render
// without resetting the underlying timer (which only depends on `delayMs`).
export function useInterval(callback: () => void, delayMs: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
