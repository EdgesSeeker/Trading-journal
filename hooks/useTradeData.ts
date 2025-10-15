
import { useMemo } from 'react';
import type { Trade, TradeFilters, SetupStats, TimeframeStats } from '../types';

export const useTradeData = (trades: Trade[], filters: TradeFilters) => {
    const tradeData = useMemo(() => {
        const filteredTrades = trades.filter(t => {
            if (filters.setup !== 'all' && t.setup !== filters.setup) return false;
            if (filters.timeframe !== 'all' && t.timeframe !== filters.timeframe) return false;
            if (filters.symbol && !t.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
            if (filters.tag !== 'all' && !t.tags.includes(filters.tag)) return false;
            return true;
        });

        const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
        const wins = filteredTrades.filter(t => t.pnl > 0);
        const losses = filteredTrades.filter(t => t.pnl <= 0);
        const winRate = filteredTrades.length > 0 ? (wins.length / filteredTrades.length * 100) : 0;
        const avgWin = wins.length > 0 ? (wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length) : 0;
        const avgLoss = losses.length > 0 ? (losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
        const totalRMultiple = filteredTrades.reduce((sum, t) => sum + t.rMultiple, 0);
        const avgRMultiple = filteredTrades.length > 0 ? (totalRMultiple / filteredTrades.length) : 0;

        const dayPnL: { [date: string]: number } = {};
        filteredTrades.forEach(t => {
            dayPnL[t.date] = (dayPnL[t.date] || 0) + t.pnl;
        });
        const sortedDays = Object.entries(dayPnL).sort((a, b) => b[1] - a[1]);
        const bestDay = sortedDays[0] || ['N/A', 0];
        const worstDay = sortedDays[sortedDays.length - 1] || ['N/A', 0];

        const setupStats: { [key: string]: SetupStats } = {};
        filteredTrades.forEach(t => {
            if (!setupStats[t.setup]) setupStats[t.setup] = { pnl: 0, trades: 0, wins: 0 };
            setupStats[t.setup].pnl += t.pnl;
            setupStats[t.setup].trades += 1;
            if (t.pnl > 0) setupStats[t.setup].wins += 1;
        });
        const bestSetup = Object.entries(setupStats).sort((a, b) => b[1].pnl - a[1].pnl)[0] || ['N/A', { pnl: 0 }];

        const timeframeStats: { [key: string]: TimeframeStats } = {};
        filteredTrades.forEach(t => {
            if (!timeframeStats[t.timeframe]) timeframeStats[t.timeframe] = { pnl: 0, trades: 0, wins: 0 };
            timeframeStats[t.timeframe].pnl += t.pnl;
            timeframeStats[t.timeframe].trades += 1;
            if (t.pnl > 0) timeframeStats[t.timeframe].wins += 1;
        });

        const mistakeCounts: { [key: string]: number } = {};
        filteredTrades.forEach(t => {
            t.mistakes.forEach(m => {
                mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
            });
        });
        const topMistakes = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

        const allTags = [...new Set(trades.flatMap(t => t.tags))];
        const allSetups = [...new Set(trades.map(t => t.setup))];
        const allTimeframes = [...new Set(trades.map(t => t.timeframe))];

        const expectancy = filteredTrades.length > 0 ? (totalPnL / filteredTrades.length) : 0;
        const profitFactor = Math.abs(avgLoss) > 0 ? (wins.reduce((s, t) => s + t.pnl, 0) / Math.abs(losses.reduce((s, t) => s + t.pnl, 0))) : 0;

        const pnlHistory = [...filteredTrades].reverse().reduce((acc, trade) => {
            const lastTotal = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
            acc.push({ name: trade.date, pnl: lastTotal + trade.pnl });
            return acc;
        }, [] as { name: string, pnl: number }[]);


        return {
            totalPnL,
            totalTrades: filteredTrades.length,
            wins: wins.length,
            losses: losses.length,
            winRate,
            avgWin,
            avgLoss,
            avgRMultiple,
            bestDay,
            worstDay,
            bestSetup,
            topMistakes,
            filteredTrades,
            setupStats,
            timeframeStats,
            allTags,
            allSetups,
            allTimeframes,
            expectancy,
            profitFactor,
            pnlHistory
        };
    }, [trades, filters]);

    return tradeData;
};
