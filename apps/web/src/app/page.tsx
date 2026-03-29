import React from 'react';
import { getSubreddits, getJobs } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { SubredditCard } from '@/components/dashboard/SubredditCard';
import { JobCard } from '@/components/dashboard/JobCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardActions } from '@/components/dashboard/DashboardClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [subreddits, jobs] = await Promise.all([
    getSubreddits().catch(() => []),
    getJobs().catch(() => []),
  ]);

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const totalPosts = subreddits.reduce((s, r) => s + r.postCount, 0);
  const totalComments = subreddits.reduce((s, r) => s + r.commentCount, 0);
  const recentJobs = jobs.slice(0, 5);

  // Rough analyses count from unique completed jobs
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;

  function formatNum(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Overview of your Reddit intelligence platform"
        actions={<DashboardActions />}
      />

      <StatsRow
        stats={[
          {
            label: 'Communities',
            value: subreddits.length,
            icon: '⬡',
            color: subreddits.length > 0 ? 'var(--ink)' : 'var(--ink-3)',
            trend: 'Total tracked subreddits',
          },
          {
            label: 'Posts Scraped',
            value: formatNum(totalPosts),
            icon: '📝',
            trend: `${formatNum(totalComments)} comments`,
          },
          {
            label: 'Completed Jobs',
            value: completedJobs,
            icon: '✓',
            color: completedJobs > 0 ? 'var(--success)' : 'var(--ink-3)',
            trend: `${jobs.length} total`,
          },
          {
            label: 'Active Jobs',
            value: activeJobs.length,
            icon: '⚡',
            color: activeJobs.length > 0 ? 'var(--brand)' : 'var(--ink-3)',
            trend: activeJobs.length > 0 ? 'Currently running' : 'None running',
          },
        ]}
      />

      {/* Communities section */}
      <section style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.03em',
            }}
          >
            Tracked Communities
          </h2>
          <Link
            href="/subreddits"
            style={{
              fontSize: '12px',
              color: 'var(--brand)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            View all →
          </Link>
        </div>

        {subreddits.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No communities tracked yet"
            description="Add your first subreddit to start monitoring Reddit for pain points and opportunities."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {subreddits.slice(0, 6).map((sr) => (
              <SubredditCard key={sr.id} subreddit={sr} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Jobs section */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.03em',
            }}
          >
            Recent Jobs
          </h2>
          <Link
            href="/jobs"
            style={{
              fontSize: '12px',
              color: 'var(--brand)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            View all →
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <EmptyState
            icon="⚡"
            title="No jobs yet"
            description="Launch a scraping job from a community page to start collecting data."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 100px 1fr 80px 80px auto',
                gap: '12px',
                padding: '0 16px 8px',
              }}
            >
              {['Community', 'Status', 'Progress', 'Posts', 'Comments', ''].map((h, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    textAlign: i >= 3 ? 'right' : 'left',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            {recentJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
