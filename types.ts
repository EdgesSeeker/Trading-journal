
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

export type ActiveTab = 'dashboard' | 'journal' | 'calendar' | 'analytics' | 'planning' | 'reports';

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
