'use client';

import { useState, useEffect, useCallback, useRef, type InputHTMLAttributes } from 'react';
import { Input } from './Input';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  ...props
}: NumberInputProps) {
  const [display, setDisplay] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const [wasClamped, setWasClamped] = useState(false);
  const clampTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up clamp timeout on unmount
  useEffect(() => {
    return () => {
      if (clampTimeoutRef.current) clearTimeout(clampTimeoutRef.current);
    };
  }, []);

  // Sync display when value changes externally (and field isn't focused)
  useEffect(() => {
    if (!isFocused) {
      setDisplay(String(value));
    }
  }, [value, isFocused]);

  const clamp = useCallback(
    (v: number) => {
      let result = v;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      return result;
    },
    [min, max]
  );

  const triggerClampFeedback = useCallback(() => {
    setWasClamped(true);
    if (clampTimeoutRef.current) clearTimeout(clampTimeoutRef.current);
    clampTimeoutRef.current = setTimeout(() => setWasClamped(false), 1200);
  }, []);

  const commit = useCallback(() => {
    const trimmed = display.trim();
    if (trimmed === '' || trimmed === '-') {
      const fallback = clamp(min !== undefined ? min : 0);
      onChange(fallback);
      setDisplay(String(fallback));
    } else {
      const parsed = Number(trimmed);
      if (isNaN(parsed)) {
        setDisplay(String(value));
      } else {
        const clamped = clamp(parsed);
        if (clamped !== parsed) triggerClampFeedback();
        onChange(clamped);
        setDisplay(String(clamped));
      }
    }
  }, [display, clamp, onChange, value, min, triggerClampFeedback]);

  return (
    <Input
      {...props}
      type="number"
      min={min}
      max={max}
      step={step}
      value={display}
      className={`${props.className ?? ''} transition-shadow ${wasClamped ? 'ring-2 ring-amber-400' : ''}`}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
        props.onFocus?.(e);
      }}
      onChange={(e) => setDisplay(e.target.value)}
      onBlur={(e) => {
        setIsFocused(false);
        commit();
        props.onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          (e.target as HTMLInputElement).blur();
        }
        props.onKeyDown?.(e);
      }}
    />
  );
}
