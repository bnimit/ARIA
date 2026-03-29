export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PainPoint {
  theme: string;
  description: string;
  frequency: number;
  quotes: string[];
  relevanceToProduct: string;
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
