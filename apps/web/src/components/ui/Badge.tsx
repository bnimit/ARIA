import React from 'react';
import { JobStatus } from '@/lib/api';

interface BadgeProps {
  status: JobStatus;
  style?: React.CSSProperties;
}

const badgeConfig: Record<JobStatus, { bg: string; color: string; border: string; label: string; dot?: string }> = {
  pending: {
    bg: 'var(--surface-2)',
    color: 'var(--ink-3)',
    border: 'var(--border)',
    label: 'Pending',
  },
  queued: {
    bg: 'rgba(217, 119, 6, 0.08)',
    color: '#B45309',
    border: 'rgba(217, 119, 6, 0.22)',
    label: 'Queued',
    dot: '#D97706',
  },
  running: {
    bg: 'rgba(79, 70, 229, 0.08)',
    color: 'var(--brand)',
    border: 'var(--brand-border)',
    label: 'Running',
    dot: 'var(--brand)',
  },
  completed: {
    bg: 'rgba(22, 163, 74, 0.08)',
    color: 'var(--success)',
    border: 'rgba(22, 163, 74, 0.22)',
    label: 'Completed',
  },
  failed: {
    bg: 'var(--error-dim)',
    color: 'var(--error)',
    border: 'rgba(220, 38, 38, 0.22)',
    label: 'Failed',
  },
  cancelled: {
    bg: 'var(--surface-2)',
    color: 'var(--ink-3)',
    border: 'var(--border)',
    label: 'Cancelled',
  },
};

export function Badge({ status, style }: BadgeProps) {
  const config = badgeConfig[status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '3px 9px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
      fontFamily: "'Nunito', sans-serif",
      ...style,
    }}>
      {config.dot && (
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: config.dot,
          animation: status === 'running' ? 'pulse-dot 1.2s ease-in-out infinite' : undefined,
          flexShrink: 0,
        }} />
      )}
      {config.label}
    </span>
  );
}
