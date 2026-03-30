import React from 'react';
import { PainPoint, Severity } from '@/lib/api';

interface PainPointCardProps {
  painPoint: PainPoint;
  index: number;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  acute:       { label: 'Acute',       color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.2)' },
  chronic:     { label: 'Chronic',     color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)' },
  aspirational:{ label: 'Aspirational',color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.2)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  lead_management: 'Lead Mgmt',
  follow_up: 'Follow-up',
  time_management: 'Time Mgmt',
  communication: 'Communication',
  admin_overhead: 'Admin',
  tool_frustration: 'Tools',
  client_relations: 'Client Relations',
  marketing: 'Marketing',
  transaction_management: 'Transactions',
  training_knowledge: 'Training',
  work_life_balance: 'Work-Life',
  other: 'Other',
};

export function PainPointCard({ painPoint, index }: PainPointCardProps) {
  const frequencyColor =
    painPoint.frequency >= 80 ? 'var(--error)'
    : painPoint.frequency >= 50 ? 'var(--warning)'
    : 'var(--brand)';

  const severity = SEVERITY_CONFIG[painPoint.severity] ?? SEVERITY_CONFIG.chronic;
  const categoryLabel = CATEGORY_LABELS[painPoint.category] ?? painPoint.category ?? 'General';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${severity.color}`,
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      animation: 'fadeIn 0.2s ease both',
      animationDelay: `${index * 0.04}s`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--ink-3)',
          fontFamily: "'DM Mono', monospace",
          flexShrink: 0,
          marginTop: '1px',
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <h3 style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {painPoint.theme}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {/* Severity badge */}
              <div style={{
                padding: '1px 7px',
                borderRadius: '4px',
                background: severity.bg,
                border: `1px solid ${severity.border}`,
                fontSize: '10px',
                fontWeight: 600,
                color: severity.color,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {severity.label}
              </div>
              {/* Frequency badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: frequencyColor }} />
                <span style={{ fontSize: '11px', color: frequencyColor, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  {painPoint.frequency}%
                </span>
              </div>
            </div>
          </div>

          {/* Category + sentiment row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--ink-3)',
              background: 'var(--surface-3)',
              padding: '1px 6px',
              borderRadius: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {categoryLabel}
            </span>
            {painPoint.sentiment && (
              <span style={{
                fontSize: '10px',
                color: painPoint.sentiment === 'negative' ? 'var(--error)' : painPoint.sentiment === 'mixed' ? 'var(--warning)' : 'var(--ink-3)',
                fontWeight: 500,
              }}>
                {painPoint.sentiment === 'negative' ? 'Negative sentiment' : painPoint.sentiment === 'mixed' ? 'Mixed sentiment' : 'Neutral'}
              </span>
            )}
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
            {painPoint.description}
          </p>
        </div>
      </div>

      {/* Frequency bar */}
      <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ height: '100%', width: `${Math.min(painPoint.frequency, 100)}%`, background: frequencyColor, borderRadius: 3 }} />
      </div>

      {/* Relevance */}
      <div style={{
        background: 'var(--brand-dim)',
        border: '1px solid var(--brand-border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
          Product Relevance
        </div>
        <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          {painPoint.relevanceToProduct}
        </p>
      </div>

      {/* Quotes */}
      {painPoint.quotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Verbatim Evidence
          </div>
          {painPoint.quotes.slice(0, 3).map((quote, i) => (
            <blockquote key={i} style={{
              background: 'var(--surface-2)',
              borderLeft: `2px solid ${severity.color}`,
              borderRadius: '0 var(--radius) var(--radius) 0',
              padding: '8px 12px',
              margin: 0,
              fontSize: '12px',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              &ldquo;{quote}&rdquo;
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
