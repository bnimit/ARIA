import React from 'react';

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 20, color = 'var(--brand)' }: SpinnerProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid var(--border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
