import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, hint, error, leftIcon, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {label && (
        <label style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--ink-2)',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {leftIcon}
          </span>
        )}
        <input
          style={{
            width: '100%',
            height: '40px',
            padding: leftIcon ? '0 14px 0 38px' : '0 14px',
            background: 'var(--surface-2)',
            border: `1.5px solid ${error ? 'var(--error)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            color: 'var(--ink)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            fontFamily: "'DM Sans', sans-serif",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--brand)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px var(--error-dim)'
              : '0 0 0 3px var(--brand-dim)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
      {(hint || error) && (
        <p style={{ fontSize: '12px', color: error ? 'var(--error)' : 'var(--ink-3)', fontWeight: 500 }}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
