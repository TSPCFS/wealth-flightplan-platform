import { useEffect, useState } from 'react';

// Returns `value` only after it has been stable for `delayMs`. Cancels the
// pending update on each new value, so rapid input doesn't burst the server.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
