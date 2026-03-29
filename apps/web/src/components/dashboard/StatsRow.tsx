import React from 'react';

interface Stat {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  trend?: string;
  trendUp?: boolean;
}

interface StatsRowProps {
  stats: Stat[];
}

// CareHub-style stat card themes — flat color bg (not gradient), icon square top-right
const cardThemes = [
  {
    iconBg: 'rgba(59, 130, 246, 0.12)',
    iconColor: '#3B82F6',
  },
  {
    iconBg: 'rgba(13, 122, 101, 0.12)',
    iconColor: '#0D7A65',
  },
  {
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconColor: '#F59E0B',
  },
  {
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#EF4444',
  },
];

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
      gap: '14px',
      marginBottom: '28px',
    }}>
      {stats.map((stat, i) => {
        const theme = cardThemes[i % cardThemes.length];
        const trendDown = stat.trendUp === false;
        return (
          <div key={i} style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '22px 24px',
            boxShadow: 'var(--shadow)',
            position: 'relative',
            animation: `fadeIn 0.25s ease ${i * 0.05}s both`,
          }}>
            {/* Icon — top-right corner */}
            <div style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 10,
              background: theme.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: theme.iconColor,
            }}>
              {stat.icon}
            </div>

            {/* Label */}
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--ink-3)',
              letterSpacing: '0.01em',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}>
              {stat.label}
            </div>

            {/* Value */}
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '30px',
              fontWeight: 700,
              color: stat.color || 'var(--ink)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginBottom: stat.trend ? '12px' : 0,
            }}>
              {stat.value}
            </div>

            {/* Trend */}
            {stat.trend && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: trendDown ? '#EF4444' : '#0D7A65',
                }}>
                  {stat.trendUp !== undefined && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                      {stat.trendUp
                        ? <path d="M6 2l4 5H2z"/>
                        : <path d="M6 10l4-5H2z"/>}
                    </svg>
                  )}
                  {stat.trend}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
