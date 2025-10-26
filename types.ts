
export interface Trade {
  id: number;
  date: string;
  symbol: string;
  type: 'Long' | 'Short';
  entry: number;
  exit: number;
  stopLoss?: number;
  shares: number;
  pnl: number;
  setup: string;
  timeframe: string;
  notes: string;
  rating: number;
  tags: string[];
  rMultiple: number;
  mistakes: string[];
  imageUrl?: string;
  // New fields for focuslist and profit-taking
  status?: 'open' | 'closed';
  entryDate?: string;
  currentPrice?: number;
  maValue?: number;
  profitTakingCompleted?: boolean;
  side?: 'BUY' | 'SELL';
  trailingMA?: '5' | '10' | '20' | '30/10' | '5/50';
  profitPercentage?: number; // % Gewinn
  distanceToSL?: number; // % Distanz zum Stop Loss
}

export interface TradingPlan {
  id: number;
  name: string;
  description: string;
  rules: string[];
  active: boolean;
}

export interface DailyReport {
  date: string;
  wentWell: string;
  wentWrong: string;
  goals: string[];
  isGenerating?: boolean;
}

export type ActiveTab = 'dashboard' | 'journal' | 'calendar' | 'analytics' | 'planning' | 'reports' | 'focuslist' | 'profit-taking' | 'stock-analysis';

export interface TradeFilters {
  setup: string;
  timeframe: string;
  symbol: string;
  tag: string;
}

export interface SetupStats {
    pnl: number;
    trades: number;
    wins: number;
}

export interface TimeframeStats {
    pnl: number;
    trades: number;
    wins: number;
}

export interface FocusListItem {
  id: number;
  symbol: string;
  date: string;
}

export interface Analysis {
  id: number;
  symbol: string;
  title: string;
  date: string;
  fullAnalysis: string;
  technicals: string;
  createdAt: string;
  tags: string[];
}
