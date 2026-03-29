import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      textAlign: 'center',
      gap: '14px',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: 'var(--surface-2)',
        border: '1.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        boxShadow: 'var(--shadow)',
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px' }}>
        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '-0.03em',
        }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ marginTop: '6px' }}>{action}</div>}
    </div>
  );
}
