'use client';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bgColor?: string;
  className?: string;
}

export function Badge({ children, color, bgColor, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        color: color ?? '#475569',
        backgroundColor: bgColor ?? '#f1f5f9',
      }}
    >
      {children}
    </span>
  );
}
