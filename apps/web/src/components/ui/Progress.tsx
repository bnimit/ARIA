import React from 'react';

interface ProgressProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  animated?: boolean;
  showLabel?: boolean;
  style?: React.CSSProperties;
}

export function Progress({
  value,
  color = 'var(--brand)',
  height = 4,
  animated = false,
  showLabel = false,
  style,
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...style }}>
      <div
        style={{
          width: '100%',
          height,
          background: 'var(--surface-2)',
        border: '1px solid var(--border)',
          borderRadius: height,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: color,
            borderRadius: height,
            transition: 'width 0.3s ease',
            animation: animated && clamped < 100 ? 'progress-pulse 2s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: "'DM Mono', monospace" }}>
          {clamped.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
