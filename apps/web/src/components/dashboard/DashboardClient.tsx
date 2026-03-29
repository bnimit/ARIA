"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddSubredditModal } from './AddSubredditModal';

export function DashboardActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Track Community
      </Button>
      <AddSubredditModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
