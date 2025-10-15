import type { Trade, TradingPlan } from './types';

export const INITIAL_TRADES: Trade[] = [
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 1, date: '2025-10-10', symbol: 'AAPL', type: 'Long' as const, entry: 178.50, exit: 182.30, stopLoss: 177.00, shares: 100, pnl: 380, setup: 'Breakout', timeframe: '15m', notes: 'Clean breakout above resistance with high volume confirmation.', rating: 4, tags: ['momentum', 'tech'], rMultiple: 2.53, mistakes: [] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 2, date: '2025-10-12', symbol: 'TSLA', type: 'Long' as const, entry: 242.00, exit: 238.50, stopLoss: 240.00, shares: 50, pnl: -175, setup: 'Support Bounce', timeframe: '5m', notes: 'Anticipated a bounce off the 240 support level, but it failed to hold. Cut the trade quickly as per my rules.', rating: 2, tags: ['support', 'ev'], rMultiple: -1.75, mistakes: ['entered too early'] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 3, date: '2025-10-13', symbol: 'SPY', type: 'Short' as const, entry: 445.20, exit: 443.80, stopLoss: 446.00, shares: 75, pnl: 105, setup: 'Rejection', timeframe: '30m', notes: 'Perfect rejection at the daily resistance. Waited for a bearish engulfing candle before entering.', rating: 5, tags: ['index', 'rejection'], rMultiple: 1.75, mistakes: [] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 4, date: '2025-10-14', symbol: 'NVDA', type: 'Long' as const, entry: 485.00, exit: 478.20, stopLoss: 482.00, shares: 30, pnl: -204, setup: 'Gap Fill', timeframe: '1h', notes: 'Tried to play the gap fill, but the overall market trend was down. Bad entry timing, ignored the macro trend.', rating: 1, tags: ['gap', 'tech'], rMultiple: -2.27, mistakes: ['ignored trend', 'position too large'] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 5, date: '2025-10-15', symbol: 'MSFT', type: 'Long' as const, entry: 335.50, exit: 339.80, stopLoss: 334.10, shares: 60, pnl: 258, setup: 'Pullback', timeframe: '15m', notes: 'Beautiful pullback to the 20 EMA on the 15m chart which was acting as dynamic support.', rating: 5, tags: ['pullback', 'tech'], rMultiple: 3.07, mistakes: [] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 6, date: '2025-10-15', symbol: 'AMZN', type: 'Short' as const, entry: 145.20, exit: 143.50, stopLoss: 146.00, shares: 40, pnl: 68, setup: 'Rejection', timeframe: '30m', notes: 'Resistance at 145.50 held strong. Small win but well-executed according to plan.', rating: 4, tags: ['rejection', 'tech'], rMultiple: 2.12, mistakes: [] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 7, date: '2025-10-16', symbol: 'GOOGL', type: 'Long' as const, entry: 140.10, exit: 142.50, stopLoss: 139.50, shares: 80, pnl: 192, setup: 'Breakout', timeframe: '15m', notes: 'Breakout from a 2-day consolidation range.', rating: 4, tags: ['breakout', 'tech'], rMultiple: 4.00, mistakes: [] },
    // FIX: Add 'as const' to the 'type' property to prevent TypeScript from widening the type to 'string'.
    { id: 8, date: '2025-10-17', symbol: 'SPY', type: 'Long' as const, entry: 444.00, exit: 443.00, stopLoss: 443.50, shares: 100, pnl: -100, setup: 'Support Bounce', timeframe: '5m', notes: 'Faked out on support bounce. Market was choppy.', rating: 2, tags: ['index', 'support'], rMultiple: -2.00, mistakes: ['over-traded'] }
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


export const INITIAL_PLANS: TradingPlan[] = [
  { id: 1, name: 'A+ Morning Breakout Strategy', description: 'Focus on high-volume momentum breakouts in the first 90 minutes of the trading session.', rules: ['Stock must be gapping up > 2% on positive news.', 'Wait for a clear consolidation pattern in the first 15-30 minutes.', 'Entry on breakout above the high of the consolidation range.', 'Initial stop loss below the low of the consolidation range.', 'Risk max 1% of account per trade.', 'Take partial profit at 2R, move stop to break-even.', 'Trail remaining position with the 9 EMA.'], active: true },
  { id: 2, name: 'Mean Reversion (S/R) Strategy', description: 'Trade bounces and rejections at key daily support and resistance levels.', rules: ['Identify clear S/R zones from the daily chart.', 'Wait for price to approach the level, do not anticipate.', 'Look for confirmation candles (e.g., hammer, shooting star, engulfing).', 'Risk 0.5% of account per trade.', 'Target the next opposing S/R level or a 3R profit.'], active: false }
];