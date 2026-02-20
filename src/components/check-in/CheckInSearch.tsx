'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface CheckInSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function CheckInSearch({ value, onChange }: CheckInSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, email, or phone..."
        className="w-full h-14 rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-cyan-600 focus:border-transparent shadow-sm"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
