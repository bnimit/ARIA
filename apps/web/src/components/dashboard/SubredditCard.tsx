'use client';
import React from 'react';
import Link from 'next/link';
import { Subreddit } from '@/lib/api';

interface SubredditCardProps {
  subreddit: Subreddit;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Icon colors per community (muted, professional)
const iconSchemes = [
  { bg: 'rgba(79,70,229,0.10)',  color: '#4F46E5' },
  { bg: 'rgba(8,145,178,0.10)',  color: '#0891B2' },
  { bg: 'rgba(22,163,74,0.10)',  color: '#16A34A' },
  { bg: 'rgba(217,119,6,0.10)',  color: '#D97706' },
  { bg: 'rgba(220,38,38,0.08)',  color: '#DC2626' },
];

function getScheme(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return iconSchemes[Math.abs(hash) % iconSchemes.length];
}

export function SubredditCard({ subreddit }: SubredditCardProps) {
  const scheme = getScheme(subreddit.name);

  return (
    <Link href={`/subreddits/${subreddit.name}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          boxShadow: 'var(--shadow)',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-2)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'var(--shadow)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: scheme.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800,
              color: scheme.color,
              flexShrink: 0,
              fontFamily: "'Nunito', sans-serif",
              letterSpacing: '-0.01em',
            }}>
              r/
            </div>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                fontFamily: "'Nunito', sans-serif",
              }}>
                r/{subreddit.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-4)', marginTop: '2px', fontWeight: 500 }}>
                Last scraped {timeAgo(subreddit.lastJobAt)}
              </div>
            </div>
          </div>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--ink-4)', flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Description */}
        {subreddit.description && (
          <p style={{
            fontSize: '12px',
            color: 'var(--ink-3)',
            marginBottom: '14px',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {subreddit.description}
          </p>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Posts', value: formatNumber(subreddit.postCount) },
            { label: 'Comments', value: formatNumber(subreddit.commentCount) },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '9px 12px',
            }}>
              <div style={{
                fontSize: '10px',
                color: 'var(--ink-4)',
                marginBottom: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontWeight: 600,
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--ink)',
                letterSpacing: '-0.03em',
                fontFamily: "'Nunito', sans-serif",
                lineHeight: 1,
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
