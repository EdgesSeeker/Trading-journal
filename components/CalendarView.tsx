
import React from 'react';
import { Calendar } from 'lucide-react';
import type { Trade } from '../types';

type CalendarViewProps = {
    trades: Trade[];
};

const CalendarView: React.FC<CalendarViewProps> = ({ trades }) => {
    const tradesByDate = trades.reduce((acc, t) => {
        if (!acc[t.date]) {
            acc[t.date] = { pnl: 0, trades: [] };
        }
        acc[t.date].pnl += t.pnl;
        acc[t.date].trades.push(t);
        return acc;
    }, {} as Record<string, { pnl: number, trades: Trade[] }>);

    const sortedDates = Object.entries(tradesByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Calendar size={20} /> Trading Calendar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedDates.map(([date, data]) => {
                    const isWin = data.pnl >= 0;
                    return (
                        <div key={date} className={`p-4 rounded-lg border-2 relative overflow-hidden transition-all hover:scale-105 hover:shadow-2xl ${isWin ? 'border-green-500/30 bg-green-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
                            <div className={`absolute -top-1 -right-1 w-16 h-16 ${isWin ? 'text-green-500/10' : 'text-red-500/10'}`}>
                                <Calendar size={64}/>
                            </div>
                            <p className="text-sm font-semibold text-gray-300">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className={`text-3xl font-bold mt-2 ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                {data.trades.length} {data.trades.length === 1 ? 'trade' : 'trades'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1">
                                {data.trades.map(t => (
                                    <span key={t.id} className={`px-2 py-0.5 rounded text-xs ${t.pnl >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`} title={`${t.symbol}: $${t.pnl.toFixed(2)}`}>
                                        {t.symbol}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default CalendarView;
