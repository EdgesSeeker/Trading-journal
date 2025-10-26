
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import type { useTradeData } from '../hooks/useTradeData';
import type { Trade } from '../types';

type AnalyticsViewProps = {
    stats: ReturnType<typeof useTradeData>;
    trades: Trade[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        signDisplay: 'auto'
    }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-lg text-sm">
                <p className="label text-gray-300 font-semibold">{label}</p>
                <p className="text-indigo-400">{`Total P/L: ${formatCurrency(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const RRDistributionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-3 rounded-lg shadow-lg text-sm">
                <p className="label text-gray-300 font-semibold">{label}</p>
                <p className="text-green-400">{`Trades: ${payload[0].value}`}</p>
                <p className="text-blue-400">{`RR Range: ${payload[0].payload.range}`}</p>
            </div>
        );
    }
    return null;
};

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats, trades }) => {
    // Create RR Distribution Data
    const createRRDistributionData = () => {
        const rrRanges = [
            { range: '< -1R', min: -Infinity, max: -1, color: '#ef4444' },
            { range: '-1R to -0.5R', min: -1, max: -0.5, color: '#f97316' },
            { range: '-0.5R to 0R', min: -0.5, max: 0, color: '#fbbf24' },
            { range: '0R to 0.5R', min: 0, max: 0.5, color: '#84cc16' },
            { range: '0.5R to 1R', min: 0.5, max: 1, color: '#22c55e' },
            { range: '1R to 2R', min: 1, max: 2, color: '#10b981' },
            { range: '2R to 5R', min: 2, max: 5, color: '#06b6d4' },
            { range: '> 5R', min: 5, max: Infinity, color: '#8b5cf6' }
        ];

        return rrRanges.map(range => {
            const tradesInRange = trades.filter(trade => 
                trade.rMultiple >= range.min && trade.rMultiple < range.max
            );
            return {
                name: range.range,
                range: range.range,
                count: tradesInRange.length,
                color: range.color,
                percentage: trades.length > 0 ? ((tradesInRange.length / trades.length) * 100).toFixed(1) : '0'
            };
        }).filter(item => item.count > 0); // Only show ranges with trades
    };

    const rrDistributionData = createRRDistributionData();
    
    const setupChartData = Object.entries(stats.setupStats).map(([name, data]) => ({ name, pnl: data.pnl }));
    const timeframeChartData = Object.entries(stats.timeframeStats).map(([name, data]) => ({ name, pnl: data.pnl }));
    const winLossData = [
        { name: 'Wins', value: stats.wins },
        { name: 'Losses', value: stats.losses },
    ];
    const COLORS = ['#22c55e', '#ef4444'];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">R-Multiple Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rrDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#9ca3af" 
                                    fontSize={10} 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip content={<RRDistributionTooltip />} cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }} />
                                <Bar dataKey="count">
                                    {rrDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800/50 p-2 rounded">
                            <p className="text-gray-400">Avg R-Multiple</p>
                            <p className="text-white font-semibold">{stats.avgRMultiple.toFixed(2)}R</p>
                        </div>
                        <div className="bg-gray-800/50 p-2 rounded">
                            <p className="text-gray-400">Total Trades</p>
                            <p className="text-white font-semibold">{trades.length}</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">P/L by Timeframe</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeframeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }} />
                                <Bar dataKey="pnl">
                                    {timeframeChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#4ade80' : '#f87171'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:col-span-1">
                    <h3 className="text-lg font-semibold text-white mb-4">Win/Loss Distribution</h3>
                    <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={winLossData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {winLossData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Trade Expectancy</p>
                            <p className="text-2xl font-bold text-indigo-400">{formatCurrency(stats.expectancy)}</p>
                            <p className="text-xs text-gray-500 mt-1">Avg. profit per trade</p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Profit Factor</p>
                            <p className="text-2xl font-bold text-green-400">{stats.profitFactor.toFixed(2)}</p>
                            <p className="text-xs text-gray-500 mt-1">Gross profit / gross loss</p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Average Win</p>
                            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.avgWin)}</p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Average Loss</p>
                            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.avgLoss)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default AnalyticsView;
