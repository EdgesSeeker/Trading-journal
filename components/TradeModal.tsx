
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Trade } from '../types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tradeData: Omit<Trade, 'id' | 'pnl' | 'rMultiple'> & { id?: number }) => void;
  trade: Trade | null;
}

const emptyTrade = {
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'Long' as 'Long' | 'Short',
    entry: '',
    exit: '',
    stopLoss: '',
    shares: '',
    setup: '',
    timeframe: '15m',
    notes: '',
    rating: 3,
    tags: '',
    mistakes: '',
    imageUrl: ''
};

const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, onSave, trade }) => {
    const [tradeData, setTradeData] = useState<any>(emptyTrade);

    useEffect(() => {
        if (trade) {
            setTradeData({
                ...trade,
                entry: trade.entry.toString(),
                exit: trade.exit.toString(),
                stopLoss: trade.stopLoss?.toString() ?? '',
                shares: trade.shares.toString(),
                tags: trade.tags.join(', '),
                mistakes: trade.mistakes.join(', '),
            });
        } else {
            setTradeData(emptyTrade);
        }
    }, [trade, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTradeData({ ...tradeData, [name]: value });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...tradeData,
            entry: parseFloat(tradeData.entry),
            exit: parseFloat(tradeData.exit),
            stopLoss: tradeData.stopLoss ? parseFloat(tradeData.stopLoss) : undefined,
            shares: parseInt(tradeData.shares, 10),
            rating: parseInt(String(tradeData.rating), 10),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-semibold">{trade ? 'Edit Trade' : 'Add New Trade'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" name="date" value={tradeData.date} onChange={handleChange} className="input-field" required />
                        <input type="text" name="symbol" value={tradeData.symbol} onChange={handleChange} placeholder="Symbol (e.g., AAPL)" className="input-field uppercase" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="type" value={tradeData.type} onChange={handleChange} className="input-field">
                            <option value="Long">Long</option>
                            <option value="Short">Short</option>
                        </select>
                        <input type="number" name="shares" value={tradeData.shares} onChange={handleChange} placeholder="Shares" className="input-field" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="number" step="0.01" name="entry" value={tradeData.entry} onChange={handleChange} placeholder="Entry Price" className="input-field" required />
                        <input type="number" step="0.01" name="exit" value={tradeData.exit} onChange={handleChange} placeholder="Exit Price" className="input-field" required />
                        <input type="number" step="0.01" name="stopLoss" value={tradeData.stopLoss} onChange={handleChange} placeholder="Stop Loss (Optional)" className="input-field" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="setup" value={tradeData.setup} onChange={handleChange} className="input-field">
                            <option value="">Select Setup</option>
                            {['Breakout', 'Support Bounce', 'Rejection', 'Gap Fill', 'Pullback', 'Reversal', 'Trend Follow'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="timeframe" value={tradeData.timeframe} onChange={handleChange} className="input-field">
                            {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Rating (1-5)</label>
                        <select name="rating" value={tradeData.rating} onChange={handleChange} className="input-field">
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                        </select>
                    </div>
                    <input type="text" name="tags" value={tradeData.tags} onChange={handleChange} placeholder="Tags (comma separated)" className="input-field" />
                    <input type="text" name="mistakes" value={tradeData.mistakes} onChange={handleChange} placeholder="Mistakes (comma separated)" className="input-field" />
                    <textarea name="notes" value={tradeData.notes} onChange={handleChange} placeholder="Notes, context, emotions..." rows={4} className="input-field" />
                </form>
                <div className="p-5 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold border border-gray-700 rounded-md hover:bg-gray-800 transition-colors">Cancel</button>
                    <button type="submit" onClick={handleSubmit} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                        <Save size={16} /> {trade ? 'Update Trade' : 'Save Trade'}
                    </button>
                </div>
            </div>
            <style>{`.input-field { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.375rem; padding: 0.75rem; width: 100%; font-size: 0.875rem; color: #d1d5db; } .input-field:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px #4f46e5; }`}</style>
        </div>
    );
};

export default TradeModal;
