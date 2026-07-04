import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Function to read from local storage
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      try {
        return JSON.parse(item) as T;
      } catch (parseError) {
        // If parsing failed, check if the target type is string.
        // If the initialValue is a string, then the stored item is likely a raw string.
        if (typeof initialValue === 'string') {
          // Repair the stored value by saving it as JSON string
          try {
            window.localStorage.setItem(key, JSON.stringify(item));
          } catch (e) {
            // ignore write errors
          }
          return item as unknown as T;
        }
        throw parseError;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);
  const isMounted = useRef(false);

  // Update internal state if the key changes
  useEffect(() => {
    setStoredValue(readValue());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist to localStorage whenever storedValue changes (skip initial mount)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (e) {
      console.error(`Error setting localStorage key "${key}":`, e);
    }
  }, [key, storedValue]);


  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    // Allow value to be a function so we have same API as useState
    setStoredValue((prevValue) => (value instanceof Function ? value(prevValue) : value));
  }, []);

  return [storedValue, setValue];
}
