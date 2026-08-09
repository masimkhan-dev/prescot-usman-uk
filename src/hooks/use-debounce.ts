import { useState, useEffect } from "react";

/**
 * Debounce a state value (e.g. search query) by specified milliseconds.
 * Helps prevent query-per-keystroke server spam while maintaining fast UI input response.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
