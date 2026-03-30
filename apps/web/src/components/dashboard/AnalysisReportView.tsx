import React from 'react';
import { AnalysisReport, CompetitiveMention, ActionableOpportunity } from '@/lib/api';
import { PainPointCard } from './PainPointCard';

interface AnalysisReportViewProps {
  report: AnalysisReport;
}

// ── Sentiment bar ────────────────────────────────────────────────────────────

function SentimentBar({ dist }: { dist: { positive: number; neutral: number; negative: number } }) {
  const pos = Math.round(dist.positive * 100);
  const neu = Math.round(dist.neutral * 100);
  const neg = Math.round(dist.negative * 100);

  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: '6px' }}>
        {pos > 0 && <div style={{ width: `${pos}%`, background: '#22c55e' }} />}
        {neu > 0 && <div style={{ width: `${neu}%`, background: '#94a3b8' }} />}
        {neg > 0 && <div style={{ width: `${neg}%`, background: '#ef4444' }} />}
      </div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
        <span style={{ color: '#22c55e', fontWeight: 600 }}>{pos}% positive</span>
        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{neu}% neutral</span>
        <span style={{ color: '#ef4444', fontWeight: 600 }}>{neg}% negative</span>
      </div>
    </div>
  );
}

// ── Confidence indicator ─────────────────────────────────────────────────────

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#d97706' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color, fontFamily: "'DM Mono', monospace" }}>{pct}%</span>
    </div>
  );
}

// ── Executive Briefing ───────────────────────────────────────────────────────

function ExecutiveBriefing({ summary }: { summary: AnalysisReport['executiveSummary'] }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(79,70,229,0.02) 100%)',
      border: '1.5px solid var(--brand-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      marginBottom: '8px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Executive Briefing
      </div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 800,
        color: 'var(--ink)',
        letterSpacing: '-0.03em',
        lineHeight: 1.3,
        marginBottom: '12px',
        fontFamily: "'Nunito', sans-serif",
      }}>
        {summary.headline}
      </h3>
      <p style={{
        fontSize: '13px',
        color: 'var(--ink-2)',
        lineHeight: 1.7,
        marginBottom: '20px',
      }}>
        {summary.narrative}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Community Sentiment
          </div>
          <SentimentBar dist={summary.sentimentDistribution} />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Analysis Confidence
          </div>
          <ConfidenceIndicator confidence={summary.confidence} />
          <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '6px' }}>
            {summary.signalPostRatio}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Emerging Themes ──────────────────────────────────────────────────────────

function EmergingThemes({ themes }: { themes: AnalysisReport['emergingThemes'] }) {
  if (!themes || themes.length === 0) return null;

  const strengthColor: Record<string, string> = {
    strong: '#22c55e',
    moderate: '#d97706',
    weak: '#94a3b8',
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
        Emerging Signals
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
        {themes.map((t, i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: strengthColor[t.signalStrength] ?? '#94a3b8',
              }} />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>{t.theme}</span>
              <span style={{
                fontSize: '10px',
                color: strengthColor[t.signalStrength] ?? '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginLeft: 'auto',
              }}>
                {t.signalStrength}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: t.quote ? '8px' : 0 }}>
              {t.description}
            </p>
            {t.quote && (
              <blockquote style={{
                borderLeft: '2px solid var(--border-2)',
                padding: '4px 10px',
                margin: 0,
                fontSize: '11px',
                color: 'var(--ink-3)',
                fontStyle: 'italic',
              }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Competitive Landscape ────────────────────────────────────────────────────

function CompetitiveLandscape({ mentions }: { mentions: CompetitiveMention[] }) {
  if (!mentions || mentions.length === 0) return null;

  const sentimentIcon: Record<string, { symbol: string; color: string }> = {
    positive: { symbol: '+', color: '#22c55e' },
    negative: { symbol: '-', color: '#ef4444' },
    mixed:    { symbol: '~', color: '#d97706' },
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
        Competitive Landscape
      </div>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {mentions.map((m, i) => {
          const s = sentimentIcon[m.sentiment] ?? sentimentIcon.mixed;
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderBottom: i < mentions.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: `${s.color}15`,
                border: `1px solid ${s.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
                color: s.color,
                flexShrink: 0,
              }}>
                {s.symbol}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>{m.name}</span>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: "'DM Mono', monospace",
                    color: 'var(--ink-3)',
                    fontWeight: 600,
                  }}>
                    {m.frequency}x
                  </span>
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--ink-3)', lineHeight: 1.4, marginTop: '2px' }}>
                  {m.context}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Actionable Opportunities ─────────────────────────────────────────────────

function Opportunities({ opportunities }: { opportunities: ActionableOpportunity[] }) {
  if (!opportunities || opportunities.length === 0) return null;

  const impactColor: Record<string, string> = {
    high: '#22c55e',
    medium: '#d97706',
    low: '#94a3b8',
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
        Actionable Opportunities
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {opportunities.map((opp, i) => (
          <div key={i} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>
                {opp.opportunity}
              </span>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: `${impactColor[opp.impact]}15`,
                  color: impactColor[opp.impact],
                  textTransform: 'uppercase',
                }}>
                  {opp.impact} impact
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: 'var(--surface-3)',
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                }}>
                  {opp.effort} effort
                </span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {opp.evidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Report View ─────────────────────────────────────────────────────────

export function AnalysisReportView({ report }: AnalysisReportViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Executive briefing at the top — the "so what?" */}
      <ExecutiveBriefing summary={report.executiveSummary} />

      {/* Pain points — the core ranked list */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
          Pain Points — Ranked by Frequency
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {report.painPoints.map((pp, i) => (
            <PainPointCard key={i} painPoint={pp} index={i} />
          ))}
        </div>
      </div>

      {/* Emerging themes */}
      <EmergingThemes themes={report.emergingThemes} />

      {/* Competitive landscape */}
      <CompetitiveLandscape mentions={report.competitiveMentions} />

      {/* Actionable opportunities */}
      <Opportunities opportunities={report.actionableOpportunities} />
    </div>
  );
}
