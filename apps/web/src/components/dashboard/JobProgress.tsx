"use client";

import React from 'react';
import { Job } from '@/lib/api';
import { useJobStream } from '@/lib/hooks';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';

interface JobProgressProps {
  jobId: string;
  initialJob: Job;
}

export function JobProgress({ jobId, initialJob }: JobProgressProps) {
  const stream = useJobStream(jobId, initialJob);

  const progress =
    initialJob.pagesTarget > 0
      ? Math.round((stream.pagesScraped / initialJob.pagesTarget) * 100)
      : 0;

  const isLive = stream.status === 'streaming';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isLive && (
            <>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--brand)',
                  animation: 'pulse-dot 1s ease-in-out infinite',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 600 }}>LIVE</span>
            </>
          )}
          {stream.status === 'completed' && (
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>DONE</span>
          )}
          {stream.status === 'failed' && (
            <span style={{ fontSize: '11px', color: 'var(--error)', fontWeight: 600 }}>FAILED</span>
          )}
        </div>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--ink-3)',
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {stream.pagesScraped}/{initialJob.pagesTarget} pages
        </span>
      </div>

      {/* Progress bar */}
      <Progress
        value={progress}
        animated={isLive}
        color={
          stream.status === 'completed'
            ? 'var(--success)'
            : stream.status === 'failed'
            ? 'var(--error)'
            : 'var(--brand)'
        }
        height={6}
      />

      {/* Counters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
        }}
      >
        {[
          { label: 'Pages', value: stream.pagesScraped },
          { label: 'Posts', value: stream.postsFound },
          { label: 'Comments', value: stream.commentsFound },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius)',
              padding: '8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: isLive ? 'var(--brand)' : 'var(--ink)',
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '-0.02em',
                transition: 'color 0.3s',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {stream.error && (
        <div
          style={{
            background: 'var(--error-dim)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            fontSize: '12px',
            color: 'var(--error)',
          }}
        >
          {stream.error}
        </div>
      )}
    </div>
  );
}
