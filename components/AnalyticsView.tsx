
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import type { useTradeData } from '../hooks/useTradeData';

type AnalyticsViewProps = {
    stats: ReturnType<typeof useTradeData>;
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

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats }) => {
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
                    <h3 className="text-lg font-semibold text-white mb-4">P/L by Setup</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={setupChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
                                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={80} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }}/>
                                <Bar dataKey="pnl">
                                    {setupChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#4ade80' : '#f87171'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
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
