import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
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

    // Update internal state if the key changes
    useEffect(() => {
        setStoredValue(readValue());
    }, [key]);

    const setValue = (value: T | ((prev: T) => T)) => {
        try {
            setStoredValue((prevValue) => {
                // Allow value to be a function so we have same API as useState
                const valueToStore =
                    value instanceof Function ? value(prevValue) : value;

                // Save to local storage
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }

                return valueToStore;
            });
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}
