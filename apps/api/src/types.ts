export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type PainPointCategory =
  | 'lead_management'
  | 'follow_up'
  | 'time_management'
  | 'communication'
  | 'admin_overhead'
  | 'tool_frustration'
  | 'client_relations'
  | 'marketing'
  | 'transaction_management'
  | 'training_knowledge'
  | 'work_life_balance'
  | 'other';

export type Severity = 'acute' | 'chronic' | 'aspirational';

export interface PainPoint {
  theme: string;
  category: PainPointCategory;
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

export interface JobProgressEvent {
  type: 'progress' | 'completed' | 'failed';
  pagesScraped: number;
  postsFound: number;
  commentsFound: number;
  error?: string;
}

// Raw RedditPost shape used internally by the scraper
export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  body: string | null;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  url: string;
  flair: string | null;
  scrapedAt: number;
}

export interface RedditComment {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  body: string;
  score: number;
  depth: number;
  scrapedAt: number;
}

export interface PostWithComments {
  post: RedditPost;
  comments: RedditComment[];
}
