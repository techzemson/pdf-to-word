export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface DocumentStats {
  pageCount: number;
  wordCount: number;
  paragraphCount: number;
  imageCount: number;
  sentimentScore: number; // 0-100
  complexityScore: number; // 0-100
  readingTimeMin: number;
  language: string;
  category: string;
  tone: string;
}

export interface Entity {
  name: string;
  type: 'Person' | 'Organization' | 'Location' | 'Date' | 'Concept';
  count: number;
}

export interface ActionItem {
  task: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export interface AnalysisResult {
  markdownContent: string;
  stats: DocumentStats;
  summary: string;
  suggestedFilename: string;
  keywords: string[];
  entities: Entity[];
  actionItems: ActionItem[];
  keyQuotes: string[];
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  base64?: string;
  uploadDate: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  date: number;
  summary: string;
  stats: DocumentStats;
}