
import React from 'react';
import { DollarSign, Percent, Target, BookOpen, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from './StatCard';
import GoalsWidget from './GoalsWidget';
import type { useTradeData } from '../hooks/useTradeData';
import type { DailyReport } from '../types';

type DashboardProps = {
    stats: ReturnType<typeof useTradeData>;
    latestReport?: DailyReport;
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
        <p className="label text-gray-300">{`Date: ${label}`}</p>
        <p className="intro text-white font-semibold">{`Cumulative P/L: ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }

  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ stats, latestReport }) => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<DollarSign size={24} />} 
                    title="Total P/L" 
                    value={formatCurrency(stats.totalPnL)}
                    colorClass="bg-indigo-600"
                />
                <StatCard 
                    icon={<Percent size={24} />} 
                    title="Win Rate" 
                    value={`${stats.winRate.toFixed(1)}%`}
                    change={`${stats.wins}W / ${stats.losses}L`}
                    colorClass="bg-green-600"
                />
                <StatCard 
                    icon={<Target size={24} />} 
                    title="Avg. R-Multiple" 
                    value={`${stats.avgRMultiple.toFixed(2)}R`}
                    colorClass="bg-yellow-600"
                />
                <StatCard 
                    icon={<BookOpen size={24} />} 
                    title="Total Trades" 
                    value={stats.totalTrades}
                    colorClass="bg-rose-600"
                />
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">P/L Curve</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.pnlHistory} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="pnl" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Symbol</th>
                                    <th scope="col" className="px-4 py-3">Date</th>
                                    <th scope="col" className="px-4 py-3">Setup</th>
                                    <th scope="col" className="px-4 py-3 text-right">P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.filteredTrades.slice(0, 5).map(trade => (
                                    <tr key={trade.id} className="hover:bg-gray-800 border-b border-gray-800">
                                        <td className="px-4 py-3 font-medium text-white">{trade.symbol}</td>
                                        <td className="px-4 py-3 text-gray-400">{trade.date}</td>
                                        <td className="px-4 py-3 text-gray-300">{trade.setup}</td>
                                        <td className={`px-4 py-3 text-right font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(trade.pnl)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <GoalsWidget report={latestReport} />
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                                <div className="bg-green-500/20 text-green-400 p-2 rounded-full"><TrendingUp size={20} /></div>
                                <div>
                                    <p className="text-xs text-gray-400">Best Setup</p>
                                    <p className="font-semibold text-white">{stats.bestSetup[0]}</p>
                                </div>
                                <p className="ml-auto font-bold text-green-400">{formatCurrency(stats.bestSetup[1].pnl)}</p>
                            </div>
                            <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                                <div className="bg-red-500/20 text-red-400 p-2 rounded-full"><TrendingDown size={20} /></div>
                                <div>
                                    <p className="text-xs text-gray-400">Worst Day</p>
                                    <p className="font-semibold text-white">{stats.worstDay[0]}</p>
                                </div>
                                <p className="ml-auto font-bold text-red-400">{formatCurrency(stats.worstDay[1])}</p>
                            </div>
                            <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                                <div className="bg-yellow-500/20 text-yellow-400 p-2 rounded-full"><Star size={20} /></div>
                                <div>
                                    <p className="text-xs text-gray-400">Profit Factor</p>
                                    <p className="font-semibold text-white">{stats.profitFactor.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
