import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '24px',
      gap: '16px',
    }}>
      <div>
        <h1 style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: '20px',
          fontWeight: 800,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--ink-3)',
            marginTop: '4px',
            margin: '4px 0 0',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
