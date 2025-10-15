
import React, { useState, useCallback } from 'react';
import { Plus, Download } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

import type { Trade, TradingPlan, ActiveTab, TradeFilters, DailyReport } from './types';
import { INITIAL_TRADES, INITIAL_PLANS } from './constants';
import { useTradeData } from './hooks/useTradeData';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import JournalView from './components/JournalView';
import AnalyticsView from './components/AnalyticsView';
import CalendarView from './components/CalendarView';
import PlanningView from './components/PlanningView';
import ReportsView from './components/ReportsView';
import TradeModal from './components/TradeModal';
import PlanModal from './components/PlanModal';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES);
  const [tradingPlans, setTradingPlans] = useState<TradingPlan[]>(INITIAL_PLANS);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const [filters, setFilters] = useState<TradeFilters>({
    setup: 'all',
    timeframe: 'all',
    symbol: '',
    tag: 'all',
  });

  const stats = useTradeData(trades, filters);

  const handleEditTrade = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setShowTradeModal(true);
  }, []);

  const handleDeleteTrade = useCallback((id: number) => {
    if (window.confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
        setTrades(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  const handleSaveTrade = useCallback((tradeData: Omit<Trade, 'id' | 'pnl' | 'rMultiple'> & { id?: number }) => {
    const pnl = (tradeData.exit - tradeData.entry) * tradeData.shares * (tradeData.type === 'Short' ? -1 : 1);
    const riskAmount = Math.abs(tradeData.entry - (tradeData.stopLoss || tradeData.exit)) * tradeData.shares;
    const rMultiple = riskAmount > 0 ? pnl / riskAmount : 0;
    
    const newTrade: Trade = {
      ...tradeData,
      id: tradeData.id || Date.now(),
      pnl: parseFloat(pnl.toFixed(2)),
      rMultiple: parseFloat(rMultiple.toFixed(2)),
      symbol: tradeData.symbol.toUpperCase(),
      tags: Array.isArray(tradeData.tags) ? tradeData.tags : String(tradeData.tags).split(',').map(t => t.trim()).filter(Boolean),
      mistakes: Array.isArray(tradeData.mistakes) ? tradeData.mistakes : String(tradeData.mistakes).split(',').map(m => m.trim()).filter(Boolean),
    };

    if (editingTrade) {
      setTrades(prev => prev.map(t => t.id === editingTrade.id ? newTrade : t));
    } else {
      setTrades(prev => [newTrade, ...prev]);
    }

    setShowTradeModal(false);
    setEditingTrade(null);
  }, [editingTrade]);
  
  const handleSavePlan = useCallback((planData: Omit<TradingPlan, 'id' | 'rules'> & { rules: string }) => {
    const newPlan: TradingPlan = {
      ...planData,
      id: Date.now(),
      rules: planData.rules.split('\n').filter(r => r.trim() !== '')
    };
    setTradingPlans(prev => [...prev, newPlan]);
    setShowPlanModal(false);
  }, []);

  const handleSaveReport = useCallback(async (date: string, wentWell: string, wentWrong: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const newReport: DailyReport = { date, wentWell, wentWrong, goals: [], isGenerating: true };

    setDailyReports(prev => {
        const existingIndex = prev.findIndex(r => r.date === date);
        const sortedReports = [...prev];
        if (existingIndex > -1) {
            sortedReports[existingIndex] = newReport;
        } else {
            sortedReports.push(newReport);
        }
        return sortedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    if (!wentWrong.trim()) {
        setDailyReports(prev => prev.map(r => r.date === date ? { ...r, goals: ["Continue executing your plan.", "Stay disciplined.", "Great work today!"], isGenerating: false } : r));
        return;
    }

    try {
        const prompt = `As a trading psychology coach, analyze the following trading challenges and mistakes. Based on them, generate 3 specific, actionable goals for the next trading session. The goals should be concise, encouraging, and start with an action verb.
        
        Mistakes/Challenges: "${wentWrong}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        goals: {
                            type: Type.ARRAY,
                            description: "A list of 3 actionable trading goals.",
                            items: {
                                type: Type.STRING,
                                description: "A single, actionable trading goal."
                            }
                        }
                    }
                }
            }
        });
        
        const resultJson = JSON.parse(response.text);
        const goals = resultJson.goals || ["Could not generate goals at this time."];
        
        setDailyReports(prev => prev.map(r => r.date === date ? { ...r, goals, isGenerating: false } : r));
    } catch (error) {
        console.error("Error generating goals:", error);
        setDailyReports(prev => prev.map(r => r.date === date ? { ...r, goals: ["Error: Could not generate goals."], isGenerating: false } : r));
    }
}, []);


  const exportData = () => {
    const data = JSON.stringify({ trades, tradingPlans, dailyReports }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zenith-trading-journal-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const renderContent = () => {
    const latestReport = dailyReports[0] || undefined;
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} latestReport={latestReport} />;
      case 'journal':
        return <JournalView stats={stats} filters={filters} setFilters={setFilters} onEdit={handleEditTrade} onDelete={handleDeleteTrade} />;
      case 'analytics':
        return <AnalyticsView stats={stats} />;
      case 'calendar':
        return <CalendarView trades={trades} />;
      case 'planning':
        return <PlanningView plans={tradingPlans} onAddPlan={() => setShowPlanModal(true)} />;
      case 'reports':
        return <ReportsView reports={dailyReports} onSaveReport={handleSaveReport} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-950 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header activeTab={activeTab}>
          <button onClick={exportData} className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700/80 px-3 py-2 rounded-md transition-colors">
            <Download size={16} /> Export Data
          </button>
          <button onClick={() => setShowTradeModal(true)} className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors font-semibold">
            <Plus size={16} /> Add Trade
          </button>
        </Header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderContent()}
        </div>
      </main>
      
      {showTradeModal && (
        <TradeModal 
          isOpen={showTradeModal} 
          onClose={() => { setShowTradeModal(false); setEditingTrade(null); }}
          onSave={handleSaveTrade}
          trade={editingTrade}
        />
      )}

      {showPlanModal && (
        <PlanModal 
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onSave={handleSavePlan}
        />
      )}
    </div>
  );
};

export default App;
