
import React from 'react';
import { Filter, Edit2, Trash2 } from 'lucide-react';
import type { useTradeData } from '../hooks/useTradeData';
import type { Trade, TradeFilters } from '../types';

type JournalViewProps = {
    stats: ReturnType<typeof useTradeData>;
    filters: TradeFilters;
    setFilters: React.Dispatch<React.SetStateAction<TradeFilters>>;
    onEdit: (trade: Trade) => void;
    onDelete: (id: number) => void;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        signDisplay: 'auto'
    }).format(value);
};

const JournalView: React.FC<JournalViewProps> = ({ stats, filters, setFilters, onEdit, onDelete }) => {
    return (
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-400" />
                    <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <select value={filters.setup} onChange={(e) => setFilters(f => ({...f, setup: e.target.value}))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Setups</option>
                        {stats.allSetups.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filters.timeframe} onChange={(e) => setFilters(f => ({...f, timeframe: e.target.value}))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Timeframes</option>
                        {stats.allTimeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                    <select value={filters.tag} onChange={(e) => setFilters(f => ({...f, tag: e.target.value}))} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Tags</option>
                        {stats.allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                    <input type="text" value={filters.symbol} onChange={(e) => setFilters(f => ({...f, symbol: e.target.value}))} placeholder="Search Symbol..." className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-800">
                    <h3 className="text-lg font-semibold">All Trades ({stats.filteredTrades.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Symbol</th>
                                <th scope="col" className="px-6 py-3">Type</th>
                                <th scope="col" className="px-6 py-3">Setup</th>
                                <th scope="col" className="px-6 py-3 text-right">P/L</th>
                                <th scope="col" className="px-6 py-3 text-right">R-Multiple</th>
                                <th scope="col" className="px-6 py-3 text-center">Rating</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.filteredTrades.map(trade => (
                                <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors">
                                    <td className="px-6 py-4 text-gray-300">{trade.date}</td>
                                    <td className="px-6 py-4 font-semibold text-white">{trade.symbol}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${trade.type === 'Long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {trade.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">{trade.setup}</td>
                                    <td className={`px-6 py-4 text-right font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(trade.pnl)}</td>
                                    <td className={`px-6 py-4 text-right font-medium ${trade.rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>{trade.rMultiple.toFixed(2)}R</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <svg key={i} className={`w-4 h-4 ${i < trade.rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4 justify-center">
                                            <button onClick={() => onEdit(trade)} className="text-gray-400 hover:text-indigo-400 transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => onDelete(trade.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default JournalView;
