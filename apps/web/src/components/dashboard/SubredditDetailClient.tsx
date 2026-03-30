"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PainPointCard } from './PainPointCard';
import { AnalysisReportView } from './AnalysisReportView';
import { JobProgress } from './JobProgress';
import { Badge } from '@/components/ui/Badge';
import { createJob, triggerAnalysis, getAnalysisPdfUrl, Analysis, AnalysisReport, PainPoint, Job } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface SubredditDetailClientProps {
  subredditName: string;
  analyses: Analysis[];
  jobs: Job[];
}

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string; }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (kind: ToastKind, message: string) =>
    setToasts((t) => [...t, { id: Date.now(), kind, message }]);
  const remove = (id: number) =>
    setToasts((t) => t.filter((x) => x.id !== id));
  return { toasts, toast: add, removeToast: remove };
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const colors: Record<ToastKind, { bg: string; border: string; icon: string; color: string }> = {
    success: { bg: 'rgba(42,138,92,0.08)', border: 'rgba(42,138,92,0.25)', icon: '✓', color: 'var(--success)' },
    error:   { bg: 'rgba(217,80,64,0.08)', border: 'rgba(217,80,64,0.25)', icon: '✕', color: 'var(--error)' },
    info:    { bg: 'var(--brand-dim)',      border: 'var(--brand-border)',  icon: 'ℹ', color: 'var(--brand)' },
  };
  const c = colors[toast.kind];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 16px', borderRadius: 'var(--radius-lg)',
      background: c.bg, border: `1.5px solid ${c.border}`,
      boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      fontSize: '13px', fontWeight: 500, color: 'var(--ink)',
      minWidth: '260px', maxWidth: '380px',
    }}>
      <span style={{ color: c.color, fontWeight: 700, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>
    </div>
  );
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function SubredditDetailClient({
  subredditName,
  analyses: initialAnalyses,
  jobs: initialJobs,
}: SubredditDetailClientProps) {
  const router = useRouter();
  const { toasts, toast, removeToast } = useToast();

  // Job modal
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [pagesTarget, setPagesTarget] = useState(5);
  const [launchingJob, setLaunchingJob] = useState(false);
  const [jobError, setJobError] = useState('');

  // Analysis
  const [analyzeProvider, setAnalyzeProvider] = useState<'anthropic' | 'openai' | 'gemini'>('anthropic');
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);
  const [analysisQueued, setAnalysisQueued] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisElapsed, setAnalysisElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Expanded analyses
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(
    initialAnalyses[0]?.id ?? null
  );

  const handleLaunchJob = async () => {
    setLaunchingJob(true);
    setJobError('');
    try {
      await createJob(subredditName, pagesTarget);
      setJobModalOpen(false);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to launch job';
      setJobError(msg);
      toast('error', msg);
    } finally {
      setLaunchingJob(false);
    }
  };

  // Poll for new analysis after triggering — analysis can take 30-90s
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownAnalysisCount = useRef(initialAnalyses.length);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const handleTriggerAnalysis = async () => {
    setTriggeringAnalysis(true);
    try {
      await triggerAnalysis(subredditName, analyzeProvider);
      setAnalysisQueued(true);
      setAnalysisRunning(true);
      setAnalysisElapsed(0);
      knownAnalysisCount.current = initialAnalyses.length;

      // Elapsed time counter
      elapsedRef.current = setInterval(() => {
        setAnalysisElapsed((s) => s + 1);
      }, 1000);

      // Poll every 8s for up to 3 minutes
      let attempts = 0;
      pollRef.current = setInterval(() => {
        attempts++;
        router.refresh();
        if (attempts >= 23) {
          // Stop after ~3 min regardless
          clearInterval(pollRef.current!);
          clearInterval(elapsedRef.current!);
          setAnalysisRunning(false);
          setAnalysisQueued(false);
        }
      }, 8000);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to trigger analysis');
    } finally {
      setTriggeringAnalysis(false);
    }
  };

  // Stop polling once a new analysis appears in the list
  useEffect(() => {
    if (analysisRunning && initialAnalyses.length > knownAnalysisCount.current) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setAnalysisRunning(false);
      setAnalysisQueued(false);
      const ppData = initialAnalyses[0]?.painPoints;
      const ppCount = ppData && !Array.isArray(ppData) && 'painPoints' in ppData
        ? (ppData as AnalysisReport).painPoints.length
        : Array.isArray(ppData) ? ppData.length : 0;
      toast('success', `Analysis complete — ${ppCount} pain points found`);
    }
  }, [initialAnalyses.length, analysisRunning]);

  const activeJobs = initialJobs.filter(
    (j) => j.status === 'running' || j.status === 'queued' || j.status === 'pending'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <Button variant="primary" onClick={() => setJobModalOpen(true)}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Launch Scrape Job
        </Button>

        {/* Analyze with provider dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            onClick={handleTriggerAnalysis}
            disabled={triggeringAnalysis || analysisQueued || analysisRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: analysisQueued ? 'var(--success-dim)' : 'var(--surface-2)',
              color: analysisQueued ? 'var(--success)' : 'var(--ink)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              cursor: triggeringAnalysis || analysisQueued ? 'not-allowed' : 'pointer',
              opacity: triggeringAnalysis ? 0.7 : 1,
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {triggeringAnalysis ? (
              <span style={{ width: 12, height: 12, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            {analysisRunning ? 'Analyzing…' : analysisQueued ? 'Queued!' : `Analyze with ${analyzeProvider}`}
          </button>
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
          <select
            value={analyzeProvider}
            onChange={(e) => setAnalyzeProvider(e.target.value as typeof analyzeProvider)}
            style={{
              padding: '6px 10px',
              background: 'var(--surface-2)',
              color: 'var(--ink-2)',
              border: 'none',
              fontSize: '12px',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
      </div>

      {/* Analysis in-progress banner */}
      {analysisRunning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: 'var(--brand-dim)',
          border: '1.5px solid var(--brand-border)',
          borderRadius: 'var(--radius-lg)',
          animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Pulsing ring + brain icon */}
          <div style={{ position: 'relative', flexShrink: 0, width: 36, height: 36 }}>
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'rgba(79,70,229,0.15)',
              animation: 'pulse 1.8s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 4,
              borderRadius: '50%',
              background: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>
              AI analysis running in background
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
              Reading posts and comments · identifying pain points with{' '}
              <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{analyzeProvider}</span>
              {' '}· this takes 30–90 seconds
            </div>
          </div>

          {/* Elapsed + shimmer bar */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--brand)',
              fontFamily: "'DM Mono', monospace",
              marginBottom: '6px',
            }}>
              {Math.floor(analysisElapsed / 60)}:{String(analysisElapsed % 60).padStart(2, '0')}
            </div>
            <div style={{ width: 80, height: 3, borderRadius: 99, background: 'rgba(79,70,229,0.15)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: '40%',
                borderRadius: 99,
                background: 'var(--brand)',
                animation: 'shimmerBar 1.6s ease-in-out infinite',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Active Jobs
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--brand-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge status={job.status} />
                    <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontFamily: "'DM Mono', monospace" }}>
                      Job #{job.id.slice(0, 8)}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                    Target: {job.pagesTarget} pages
                  </span>
                </div>
                <JobProgress jobId={job.id} initialJob={job} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyses */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Pain Point Analyses
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
            {initialAnalyses.length} {initialAnalyses.length === 1 ? 'analysis' : 'analyses'}
          </span>
        </div>

        {initialAnalyses.length === 0 ? (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 32px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '8px' }}>No analyses yet</p>
            <p style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
              Run a scrape job first, then click "Analyze" to surface pain points from community discussions.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {initialAnalyses.map((analysis) => {
              const isExpanded = expandedAnalysis === analysis.id;
              return (
                <div
                  key={analysis.id}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isExpanded ? 'var(--border-2)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Analysis header */}
                  <button
                    onClick={() => setExpandedAnalysis(isExpanded ? null : analysis.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          padding: '2px 8px',
                          borderRadius: '100px',
                          background: 'var(--brand-dim)',
                          border: '1px solid var(--brand-border)',
                          fontSize: '11px',
                          color: 'var(--brand)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {analysis.model}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>
                        {(() => {
                          const data = analysis.painPoints;
                          if (data && !Array.isArray(data) && 'painPoints' in data) {
                            const report = data as AnalysisReport;
                            return `${report.painPoints.length} pain points · ${report.emergingThemes?.length ?? 0} signals · ${report.competitiveMentions?.length ?? 0} tools`;
                          }
                          const arr = Array.isArray(data) ? data : [];
                          return `${arr.length} pain points identified`;
                        })()}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>
                        {analysis.totalPosts} posts · {analysis.totalComments} comments
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        {formatTime(analysis.createdAt)}
                      </span>
                      <a
                        href={getAnalysisPdfUrl(analysis.id)}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          fontSize: '11px',
                          color: 'var(--ink-2)',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        PDF
                      </a>
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          color: 'var(--ink-3)',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded analysis content */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border)',
                        padding: '20px',
                        animation: 'fadeIn 0.15s ease',
                      }}
                    >
                      {(() => {
                        // Detect new report format vs legacy flat array
                        const data = analysis.painPoints;
                        const isReport = data && !Array.isArray(data) && 'executiveSummary' in data;

                        if (isReport) {
                          const report = data as AnalysisReport;
                          return report.painPoints.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--ink-3)', textAlign: 'center', padding: '16px' }}>
                              No pain points found in this analysis.
                            </p>
                          ) : (
                            <AnalysisReportView report={report} />
                          );
                        }

                        // Legacy flat PainPoint[] format
                        const painPoints = (Array.isArray(data) ? data : []) as PainPoint[];
                        return painPoints.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--ink-3)', textAlign: 'center', padding: '16px' }}>
                            No pain points found in this analysis.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {painPoints.map((pp, i) => (
                              <PainPointCard key={i} painPoint={pp} index={i} />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={() => removeToast(t.id)} />
          </div>
        ))}
      </div>

      {/* Launch Job Modal */}
      <Modal
        open={jobModalOpen}
        onClose={() => {
          setJobModalOpen(false);
          setJobError('');
        }}
        title="Launch Scrape Job"
        footer={
          <>
            <Button variant="ghost" onClick={() => setJobModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={launchingJob} onClick={handleLaunchJob}>
              Launch Job
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-2)' }}>
                Pages to Scrape
              </label>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--brand)',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {pagesTarget}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={pagesTarget}
              onChange={(e) => setPagesTarget(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--brand)',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-4)' }}>1 page</span>
              <span style={{ fontSize: '11px', color: 'var(--ink-4)' }}>20 pages</span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--ink-3)',
            }}
          >
            <strong style={{ color: 'var(--ink-2)' }}>Estimated:</strong>{' '}
            ~{pagesTarget * 25} posts and ~{pagesTarget * 100} comments from r/{subredditName}
          </div>

          {jobError && (
            <div
              style={{
                background: 'var(--error-dim)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
                fontSize: '12px',
                color: 'var(--error)',
              }}
            >
              {jobError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
