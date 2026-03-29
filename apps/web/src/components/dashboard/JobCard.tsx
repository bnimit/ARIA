'use client';
import React from 'react';
import { Job } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

interface JobCardProps {
  job: Job;
  onCancel?: (id: string) => void;
  compact?: boolean;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function JobCard({ job, onCancel, compact }: JobCardProps) {
  const progress = job.pagesTarget > 0 ? Math.round((job.pagesScraped / job.pagesTarget) * 100) : 0;
  const isActive = job.status === 'running' || job.status === 'queued' || job.status === 'pending';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact
        ? '1fr auto auto auto'
        : '180px 110px 1fr 80px 80px auto',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow)',
      transition: 'border-color 0.12s',
    }}>
      {/* Subreddit */}
      <div>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          fontFamily: "'Nunito', sans-serif",
        }}>
          r/{job.subreddit}
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--ink-4)',
          marginTop: '2px',
          fontFamily: "'DM Mono', monospace",
        }}>
          {formatTime(job.createdAt)}
        </div>
      </div>

      {/* Status */}
      <Badge status={job.status} />

      {!compact && (
        <>
          {/* Progress */}
          <div style={{ minWidth: 0 }}>
            <Progress
              value={progress}
              animated={isActive}
              color={
                job.status === 'completed' ? 'var(--success)'
                : job.status === 'failed' ? 'var(--error)'
                : 'var(--brand)'
              }
              height={4}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--ink-4)', fontWeight: 500 }}>
                {job.pagesScraped}/{job.pagesTarget} pages
              </span>
              <span style={{ fontSize: '10px', color: 'var(--ink-3)', fontWeight: 600 }}>{progress}%</span>
            </div>
          </div>

          {/* Posts */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '-0.03em',
            }}>
              {job.postsFound}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>posts</div>
          </div>

          {/* Comments */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '-0.03em',
            }}>
              {job.commentsFound}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>comments</div>
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {isActive && onCancel ? (
          <button
            onClick={() => onCancel(job.id)}
            style={{
              padding: '4px 11px',
              borderRadius: '6px',
              background: 'var(--error-dim)',
              color: 'var(--error)',
              border: '1px solid rgba(220, 38, 38, 0.18)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            Cancel
          </button>
        ) : (
          <span style={{ width: 60 }} />
        )}
      </div>
    </div>
  );
}
