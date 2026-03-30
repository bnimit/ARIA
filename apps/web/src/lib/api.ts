const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Subreddit {
  id: string;
  name: string;
  description: string | null;
  postCount: number;
  commentCount: number;
  lastJobAt: string | null;
  createdAt: string;
}

export interface SubredditDetail extends Subreddit {
  recentAnalyses: Analysis[];
}

export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  subreddit: string;
  subredditId: string;
  status: JobStatus;
  pagesTarget: number;
  pagesScraped: number;
  postsFound: number;
  commentsFound: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type Severity = 'acute' | 'chronic' | 'aspirational';

export interface PainPoint {
  theme: string;
  category: string;
  description: string;
  frequency: number;
  severity: Severity;
  sentiment: 'negative' | 'mixed' | 'neutral';
  quotes: string[];
  relevanceToProduct: string;
}

export interface CompetitiveMention {
  name: string;
  sentiment: 'positive' | 'negative' | 'mixed';
  context: string;
  frequency: number;
}

export interface ActionableOpportunity {
  opportunity: string;
  evidence: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

export interface AnalysisReport {
  executiveSummary: {
    headline: string;
    narrative: string;
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    confidence: number;
    signalPostRatio: string;
  };
  painPoints: PainPoint[];
  emergingThemes: Array<{
    theme: string;
    description: string;
    signalStrength: 'strong' | 'moderate' | 'weak';
    quote: string;
  }>;
  competitiveMentions: CompetitiveMention[];
  actionableOpportunities: ActionableOpportunity[];
}

export interface Analysis {
  id: string;
  subreddit: string;
  model: string;
  totalPosts: number;
  totalComments: number;
  painPoints: AnalysisReport | PainPoint[];
  createdAt: string;
}

export interface Settings {
  anthropicKey?: string;
  openaiKey?: string;
  geminiKey?: string;
}

export type JobProgressEvent = {
  type: 'progress' | 'completed' | 'failed';
  pagesScraped: number;
  postsFound: number;
  commentsFound: number;
  error?: string;
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('aria_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const hasBody = options?.body != null;
  const res = await fetch(`${API}${path}`, {
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeader(),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || json.error || text || `HTTP ${res.status}`);
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) throw new Error(text || `HTTP ${res.status}`);
      throw parseErr;
    }
  }
  return res.json() as Promise<T>;
}

// Subreddits
export async function getSubreddits(): Promise<Subreddit[]> {
  return apiFetch<Subreddit[]>('/api/subreddits');
}

export async function getSubreddit(name: string): Promise<SubredditDetail> {
  return apiFetch<SubredditDetail>(`/api/subreddits/${name}`);
}

export async function createSubreddit(name: string): Promise<Subreddit> {
  return apiFetch<Subreddit>('/api/subreddits', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteSubreddit(name: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/subreddits/${name}`, { method: 'DELETE' });
}

// Jobs
export async function getJobs(subreddit?: string): Promise<Job[]> {
  const query = subreddit ? `?subreddit=${encodeURIComponent(subreddit)}` : '';
  return apiFetch<Job[]>(`/api/jobs${query}`);
}

export async function createJob(subreddit: string, pagesTarget: number): Promise<Job> {
  return apiFetch<Job>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify({ subreddit, pagesTarget }),
  });
}

export async function cancelJob(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/jobs/${id}`, { method: 'DELETE' });
}

export function getJobStreamUrl(id: string): string {
  return `${API}/api/jobs/${id}/stream`;
}

// Analyses
export async function getAnalyses(subreddit: string): Promise<Analysis[]> {
  return apiFetch<Analysis[]>(`/api/subreddits/${subreddit}/analyses`);
}

export async function triggerAnalysis(
  subreddit: string,
  provider?: 'anthropic' | 'openai' | 'gemini'
): Promise<{ queued: true }> {
  return apiFetch<{ queued: true }>(`/api/subreddits/${subreddit}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ ...(provider ? { provider } : {}) }),
  });
}

export async function getAnalysis(id: string): Promise<Analysis> {
  return apiFetch<Analysis>(`/api/analyses/${id}`);
}

export function getAnalysisPdfUrl(id: string): string {
  return `${API}/api/analyses/${id}/pdf`;
}

// Settings
export async function getSettings(): Promise<Settings> {
  return apiFetch<Settings>('/api/settings');
}

export async function saveSettings(settings: Partial<Settings>): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
