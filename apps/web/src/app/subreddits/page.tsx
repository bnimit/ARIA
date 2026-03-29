"use client";

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { SubredditCard } from '@/components/dashboard/SubredditCard';
import { AddSubredditModal } from '@/components/dashboard/AddSubredditModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useSubreddits } from '@/lib/hooks';
import { deleteSubreddit } from '@/lib/api';

export default function SubredditsPage() {
  const { subreddits, loading, error, refresh } = useSubreddits(30000);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (name: string) => {
    if (!confirm(`Remove r/${name} from tracking? This will not delete scraped data.`)) return;
    setDeleting(name);
    try {
      await deleteSubreddit(name);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove subreddit');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Header
        title="Communities"
        subtitle="Manage your tracked Reddit communities"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Community
          </Button>
        }
      />

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Spinner size={28} />
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: 'var(--error-dim)',
            border: '1.5px solid rgba(217, 80, 64, 0.2)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: 'var(--error)',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && subreddits.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No communities tracked"
          description="Start monitoring a subreddit to collect posts and surface AI-powered insights."
          action={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Track your first community
            </Button>
          }
        />
      )}

      {!loading && subreddits.length > 0 && (
        <>
          {/* Count */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 500 }}>
              {subreddits.length} {subreddits.length === 1 ? 'community' : 'communities'} tracked
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {subreddits.map((sr) => (
              <div key={sr.id} style={{ position: 'relative' }}>
                <SubredditCard subreddit={sr} />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(sr.name);
                  }}
                  disabled={deleting === sr.name}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--ink-3)',
                    boxShadow: 'var(--shadow)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    opacity: deleting === sr.name ? 0.5 : 1,
                    zIndex: 1,
                  }}
                  title="Remove community"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <AddSubredditModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          refresh();
        }}
      />
    </>
  );
}
