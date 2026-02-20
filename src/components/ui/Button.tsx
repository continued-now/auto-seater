'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
  secondary: 'bg-muted text-foreground hover:bg-border',
  danger: 'bg-danger text-white hover:bg-red-700',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
