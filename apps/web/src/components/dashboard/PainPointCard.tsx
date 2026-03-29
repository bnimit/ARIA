import React from 'react';
import { PainPoint } from '@/lib/api';

interface PainPointCardProps {
  painPoint: PainPoint;
  index: number;
}

export function PainPointCard({ painPoint, index }: PainPointCardProps) {
  const frequencyColor =
    painPoint.frequency >= 80 ? 'var(--error)'
    : painPoint.frequency >= 50 ? 'var(--warning)'
    : 'var(--brand)';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              fontFamily: "'Nunito', sans-serif",
            }}>
              {painPoint.theme}
            </h3>
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
          <p style={{ fontSize: '12.5px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
            {painPoint.description}
          </p>
        </div>
      </div>

      {/* Frequency bar */}
      <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ height: '100%', width: `${painPoint.frequency}%`, background: frequencyColor, borderRadius: 3 }} />
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
            Example Quotes
          </div>
          {painPoint.quotes.slice(0, 3).map((quote, i) => (
            <blockquote key={i} style={{
              background: 'var(--surface-2)',
              borderLeft: '2px solid var(--border-2)',
              borderRadius: '0 var(--radius) var(--radius) 0',
              padding: '8px 12px',
              margin: 0,
              fontSize: '12px',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              "{quote}"
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
