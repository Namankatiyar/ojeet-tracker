import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'default_value'));
    expect(result.current[0]).toBe('default_value');
  });

  it('should read and parse valid JSON from localStorage', () => {
    window.localStorage.setItem('test_key', JSON.stringify('stored_value'));
    const { result } = renderHook(() => useLocalStorage('test_key', 'default_value'));
    expect(result.current[0]).toBe('stored_value');
  });

  it('should fallback to raw string and repair it when JSON parsing fails and initialValue is a string', () => {
    // Store raw string without double quotes (invalid JSON string)
    window.localStorage.setItem('test_key', 'raw_string_value');

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test_key', 'default_value'));

    // Should successfully read raw_string_value
    expect(result.current[0]).toBe('raw_string_value');

    // Should not have output a warning to console
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    // localStorage value should be repaired (stored as valid JSON string)
    expect(window.localStorage.getItem('test_key')).toBe(JSON.stringify('raw_string_value'));
  });

  it('should warning-log and return initial value when JSON parsing fails and initialValue is NOT a string', () => {
    // Store raw non-JSON string
    window.localStorage.setItem('test_key', 'not_json_value');

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test_key', 123)); // initialValue is number

    // Should fall back to initialValue (123)
    expect(result.current[0]).toBe(123);

    // Should have logged a console warning
    expect(consoleWarnSpy).toHaveBeenCalled();

    // Should NOT have overwritten localstorage since type is not string
    expect(window.localStorage.getItem('test_key')).toBe('not_json_value');
  });

  it('should update localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'default_value'));

    act(() => {
      result.current[1]('new_value');
    });

    expect(result.current[0]).toBe('new_value');
    expect(window.localStorage.getItem('test_key')).toBe(JSON.stringify('new_value'));
  });
});
