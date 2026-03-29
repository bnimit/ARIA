import React from 'react';
import { getSubreddit, getJobs } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { SubredditDetailClient } from '@/components/dashboard/SubredditDetailClient';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { name: string };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never scraped';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default async function SubredditDetailPage({ params }: PageProps) {
  const name = decodeURIComponent(params.name);

  let subreddit;
  try {
    subreddit = await getSubreddit(name);
  } catch {
    notFound();
  }

  const jobs = await getJobs(name).catch(() => []);

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Link
          href="/subreddits"
          style={{ fontSize: '13px', color: 'var(--ink-3)', textDecoration: 'none' }}
        >
          Communities
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-4)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>r/{name}</span>
      </div>

      <Header
        title={`r/${subreddit.name}`}
        subtitle={subreddit.description ?? `Reddit community · Last activity ${timeAgo(subreddit.lastJobAt)}`}
      />

      <StatsRow
        stats={[
          {
            label: 'Posts Scraped',
            value: formatNum(subreddit.postCount),
            icon: '📝',
            trend: 'Total collected',
          },
          {
            label: 'Comments',
            value: formatNum(subreddit.commentCount),
            icon: '💬',
            trend: 'Total collected',
          },
          {
            label: 'Analyses Run',
            value: subreddit.recentAnalyses.length,
            icon: '🧠',
            color: subreddit.recentAnalyses.length > 0 ? 'var(--brand)' : 'var(--ink-3)',
            trend: 'Pain point reports',
          },
          {
            label: 'Last Scraped',
            value: subreddit.lastJobAt ? timeAgo(subreddit.lastJobAt) : '—',
            icon: '⏱',
            color: 'var(--ink-2)',
          },
        ]}
      />

      <SubredditDetailClient
        subredditName={subreddit.name}
        analyses={subreddit.recentAnalyses}
        jobs={jobs}
      />
    </>
  );
}
