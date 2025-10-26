import type { Trade, TradingPlan } from './types';

export const INITIAL_TRADES: Trade[] = [];


export const INITIAL_PLANS: TradingPlan[] = [
  { id: 1, name: 'A+ Morning Breakout Strategy', description: 'Focus on high-volume momentum breakouts in the first 90 minutes of the trading session.', rules: ['Stock must be gapping up > 2% on positive news.', 'Wait for a clear consolidation pattern in the first 15-30 minutes.', 'Entry on breakout above the high of the consolidation range.', 'Initial stop loss below the low of the consolidation range.', 'Risk max 1% of account per trade.', 'Take partial profit at 2R, move stop to break-even.', 'Trail remaining position with the 9 EMA.'], active: true },
  { id: 2, name: 'Mean Reversion (S/R) Strategy', description: 'Trade bounces and rejections at key daily support and resistance levels.', rules: ['Identify clear S/R zones from the daily chart.', 'Wait for price to approach the level, do not anticipate.', 'Look for confirmation candles (e.g., hammer, shooting star, engulfing).', 'Risk 0.5% of account per trade.', 'Target the next opposing S/R level or a 3R profit.'], active: false }
];