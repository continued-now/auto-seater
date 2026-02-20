'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ checked, onCheckedChange, className = '' }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c === true)}
      className={`h-4 w-4 shrink-0 rounded border border-border bg-white data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors cursor-pointer ${className}`}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        {checked === 'indeterminate' ? <Minus size={12} /> : <Check size={12} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
