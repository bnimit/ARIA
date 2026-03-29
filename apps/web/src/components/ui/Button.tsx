'use client';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'teal';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--brand)',
    color: '#fff',
    border: '1.5px solid var(--brand)',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(59,123,248,0.30)',
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--ink)',
    border: '1.5px solid var(--border)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink-2)',
    border: '1.5px solid transparent',
    fontWeight: 600,
  },
  teal: {
    background: 'var(--teal)',
    color: '#fff',
    border: '1.5px solid var(--teal)',
    fontWeight: 700,
  },
  danger: {
    background: 'var(--error-dim)',
    color: 'var(--error)',
    border: '1.5px solid rgba(220, 38, 38, 0.2)',
    fontWeight: 600,
  },
  success: {
    background: 'var(--success-dim)',
    color: 'var(--success)',
    border: '1.5px solid rgba(22, 163, 74, 0.2)',
    fontWeight: 600,
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: '12px', height: '30px', borderRadius: '8px' },
  md: { padding: '7px 16px', fontSize: '13.5px', height: '36px', borderRadius: '9px' },
  lg: { padding: '10px 22px', fontSize: '14px', height: '42px', borderRadius: '10px' },
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.13s ease',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        outline: 'none',
        letterSpacing: '-0.01em',
        fontFamily: "'Nunito', sans-serif",
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.filter = 'brightness(0.92)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'scale(0.98)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      {...props}
    >
      {loading && (
        <span style={{
          width: 13, height: 13,
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {children}
    </button>
  );
}
