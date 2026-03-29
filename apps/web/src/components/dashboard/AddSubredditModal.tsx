"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createSubreddit } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AddSubredditModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddSubredditModal({ open, onClose }: AddSubredditModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().replace(/^r\//, '');
    if (!trimmed) {
      setError('Please enter a subreddit name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createSubreddit(trimmed);
      setName('');
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subreddit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Track a Community"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit as any}>
            Add Community
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Subreddit Name"
          placeholder="e.g. webdev or r/webdev"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          error={error}
          autoFocus
          hint="Enter the subreddit name with or without r/"
        />
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            fontSize: '12px',
            color: 'var(--ink-3)',
            lineHeight: 1.6,
          }}
        >
          ARCA will begin monitoring this community and you can launch scraping jobs to collect posts and comments for AI analysis.
        </div>
      </form>
    </Modal>
  );
}
