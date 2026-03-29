"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getJobs, getSubreddits, getJobStreamUrl, Job, Subreddit, JobProgressEvent } from './api';

export function useSubreddits(refreshInterval = 0) {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await getSubreddits();
      setSubreddits(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subreddits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (refreshInterval > 0) {
      const id = setInterval(fetch, refreshInterval);
      return () => clearInterval(id);
    }
  }, [fetch, refreshInterval]);

  return { subreddits, loading, error, refresh: fetch };
}

export function useJobs(subreddit?: string, refreshInterval = 5000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await getJobs(subreddit);
      setJobs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [subreddit]);

  useEffect(() => {
    fetch();
    if (refreshInterval > 0) {
      const id = setInterval(fetch, refreshInterval);
      return () => clearInterval(id);
    }
  }, [fetch, refreshInterval]);

  return { jobs, loading, error, refresh: fetch };
}

export interface JobStreamState {
  pagesScraped: number;
  postsFound: number;
  commentsFound: number;
  status: 'streaming' | 'completed' | 'failed' | 'closed';
  error?: string;
}

export function useJobStream(jobId: string, initialJob: Job) {
  const [state, setState] = useState<JobStreamState>({
    pagesScraped: initialJob.pagesScraped,
    postsFound: initialJob.postsFound,
    commentsFound: initialJob.commentsFound,
    status: initialJob.status === 'running' || initialJob.status === 'queued' ? 'streaming' : 'closed',
  });

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const isActive = initialJob.status === 'running' || initialJob.status === 'queued' || initialJob.status === 'pending';
    if (!isActive) return;

    const es = new EventSource(getJobStreamUrl(jobId));
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: JobProgressEvent = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          pagesScraped: event.pagesScraped,
          postsFound: event.postsFound,
          commentsFound: event.commentsFound,
          status: event.type === 'completed' ? 'completed' : event.type === 'failed' ? 'failed' : 'streaming',
          error: event.error,
        }));
        if (event.type === 'completed' || event.type === 'failed') {
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, status: 'closed' }));
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId, initialJob.status]);

  return state;
}
