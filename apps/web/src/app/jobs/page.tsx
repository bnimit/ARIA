"use client";

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { JobProgress } from '@/components/dashboard/JobProgress';
import { useJobs } from '@/lib/hooks';
import { cancelJob, Job, JobStatus } from '@/lib/api';
import Link from 'next/link';

type FilterStatus = 'all' | JobStatus;

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function duration(start: string | null, end: string | null): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.floor((e - s) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function JobRow({ job, onCancel }: { job: Job; onCancel: (id: string) => void }) {
  const isActive = job.status === 'running' || job.status === 'queued' || job.status === 'pending';
  const [expanded, setExpanded] = useState(isActive);
  const progress = job.pagesTarget > 0 ? Math.round((job.pagesScraped / job.pagesTarget) * 100) : 0;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1.5px solid ${isActive ? 'var(--brand-border)' : 'var(--border)'}`,
      boxShadow: 'var(--shadow)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 100px 40px 1fr 70px 70px 90px 90px auto',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          cursor: isActive ? 'pointer' : undefined,
        }}
        onClick={isActive ? () => setExpanded((v) => !v) : undefined}
      >
        {/* Subreddit */}
        <Link
          href={`/subreddits/${job.subreddit}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--brand)',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          r/{job.subreddit}
        </Link>

        {/* Status */}
        <Badge status={job.status} />

        {/* Pages target */}
        <span
          style={{
            fontSize: '12px',
            color: 'var(--ink-3)',
            fontFamily: "'DM Mono', monospace",
            textAlign: 'center',
          }}
        >
          {job.pagesTarget}p
        </span>

        {/* Progress */}
        <div style={{ minWidth: 0 }}>
          <Progress
            value={progress}
            animated={isActive}
            height={4}
            color={
              job.status === 'completed'
                ? 'var(--success)'
                : job.status === 'failed'
                ? 'var(--error)'
                : 'var(--brand)'
            }
          />
          <span style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px', display: 'block', fontFamily: "'DM Mono', monospace" }}>
            {job.pagesScraped}/{job.pagesTarget}
          </span>
        </div>

        {/* Posts */}
        <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: "'DM Mono', monospace", textAlign: 'right' }}>
          {job.postsFound}
        </span>

        {/* Comments */}
        <span style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: "'DM Mono', monospace", textAlign: 'right' }}>
          {job.commentsFound}
        </span>

        {/* Started */}
        <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{formatTime(job.startedAt)}</span>

        {/* Duration */}
        <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: "'DM Mono', monospace" }}>
          {duration(job.startedAt, job.completedAt)}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
          {isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(job.id);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--error-dim)',
                color: 'var(--error)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          )}
          {job.error && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--error)',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={job.error}
            >
              {job.error}
            </span>
          )}
        </div>
      </div>

      {/* Live progress panel */}
      {isActive && expanded && (
        <div
          style={{
            borderTop: '1.5px solid var(--border)',
            padding: '16px',
            background: 'var(--surface-2)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <JobProgress jobId={job.id} initialJob={job} />
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const { jobs, loading, error, refresh } = useJobs(undefined, 5000);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await cancelJob(id);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel job');
    } finally {
      setCancelling(null);
    }
  };

  const filteredJobs = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);
  const activeCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;

  return (
    <>
      <Header
        title="Jobs"
        subtitle="Monitor scraping jobs across all communities"
        actions={
          <Button variant="secondary" size="sm" onClick={refresh}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        }
      />

      {/* Stats bar */}
      {!loading && jobs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow)',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: 'Total', value: jobs.length, color: 'var(--ink)' },
            { label: 'Active', value: activeCount, color: 'var(--brand)' },
            { label: 'Completed', value: jobs.filter((j) => j.status === 'completed').length, color: 'var(--success)' },
            { label: 'Failed', value: jobs.filter((j) => j.status === 'failed').length, color: 'var(--error)' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: '20px', fontWeight: 800, color: stat.color, letterSpacing: '-0.04em' }}>
                {stat.value}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{stat.label}</span>
            </div>
          ))}

          {activeCount > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', animation: 'pulse-dot 1s ease-in-out infinite', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 600 }}>Auto-refreshing every 5s</span>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          marginBottom: '16px',
          padding: '3px',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)',
          width: 'fit-content',
        }}
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '5px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: filter === f.value ? 600 : 500,
              color: filter === f.value ? 'var(--brand)' : 'var(--ink-3)',
              background: filter === f.value ? 'var(--brand-dim)' : 'transparent',
              border: `1.5px solid ${filter === f.value ? 'var(--brand-border)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {f.label}
            {f.value !== 'all' && (
              <span style={{ marginLeft: '4px', opacity: 0.6, fontFamily: "'DM Mono', monospace" }}>
                ({jobs.filter((j) => j.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Spinner size={28} />
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: 'var(--error-dim)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: 'var(--error)',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {!loading && filteredJobs.length === 0 && (
        <EmptyState
          icon="⚡"
          title={filter === 'all' ? 'No jobs yet' : `No ${filter} jobs`}
          description={
            filter === 'all'
              ? 'Launch a scraping job from a community page to start collecting data.'
              : `No jobs with status "${filter}" found.`
          }
          action={
            filter !== 'all' ? (
              <Button variant="ghost" onClick={() => setFilter('all')}>
                Show all jobs
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && filteredJobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 100px 40px 1fr 70px 70px 90px 90px auto',
              gap: '12px',
              padding: '0 16px 8px',
            }}
          >
            {['Community', 'Status', 'Pages', 'Progress', 'Posts', 'Cmts', 'Started', 'Duration', ''].map((h, i) => (
              <span
                key={i}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: i >= 4 ? 'right' : 'left',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {filteredJobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </>
  );
}
