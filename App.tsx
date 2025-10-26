
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

import type { Trade, TradingPlan, ActiveTab, TradeFilters, DailyReport, Analysis } from './types';
import { INITIAL_TRADES, INITIAL_PLANS } from './constants';
import { useTradeData } from './hooks/useTradeData';
import { useBackupSystem } from './hooks/useBackupSystem';

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
import FocuslistView from './components/FocuslistView';
import ProfitTakingView from './components/ProfitTakingView';
import FocusListView from './components/FocusListView';
import StockAnalysisView from './components/StockAnalysisView';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  // Initialize with empty state first, then restore from backup
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradingPlans, setTradingPlans] = useState<TradingPlan[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

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
  const { createBackup, restoreBackup, startAutoBackup } = useBackupSystem();

  const handleEditTrade = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setShowTradeModal(true);
  }, []);


  const handleSaveReport = useCallback(async (date: string, wentWell: string, wentWrong: string) => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyCw1HK1xcZfJVVxXNDGp-F1BAkWB4z5L1A';
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.error('API Key not found. Please check your configuration.');
      alert('API Key not configured. Please add GEMINI_API_KEY to .env.local');
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const newReport: DailyReport = { date, wentWell, wentWrong, goals: [], isGenerating: true };

    setDailyReports(prev => {
        const existingIndex = prev.findIndex(r => r.date === date);
        const sortedReports = [...prev];
        if (existingIndex > -1) {
            sortedReports[existingIndex] = newReport;
        } else {
            sortedReports.push(newReport);
        }
        const updatedReports = sortedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Backup after report change
        setTimeout(() => {
          createBackup(trades, tradingPlans, updatedReports);
        }, 100);
        
        return updatedReports;
    });

    if (!wentWrong.trim()) {
        setDailyReports(prev => {
          const updatedReports = prev.map(r => r.date === date ? { ...r, goals: ["Continue executing your plan.", "Stay disciplined.", "Great work today!"], isGenerating: false } : r);
          
          // Backup after report update
          setTimeout(() => {
            createBackup(trades, tradingPlans, updatedReports);
          }, 100);
          
          return updatedReports;
        });
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
        
        setDailyReports(prev => {
          const updatedReports = prev.map(r => r.date === date ? { ...r, goals, isGenerating: false } : r);
          
          // Backup after AI-generated goals
          setTimeout(() => {
            createBackup(trades, tradingPlans, updatedReports);
          }, 100);
          
          return updatedReports;
        });
    } catch (error) {
        console.error("Error generating goals:", error);
        setDailyReports(prev => {
          const updatedReports = prev.map(r => r.date === date ? { ...r, goals: ["Error: Could not generate goals."], isGenerating: false } : r);
          
          // Backup even on error
          setTimeout(() => {
            createBackup(trades, tradingPlans, updatedReports);
          }, 100);
          
          return updatedReports;
        });
    }
}, [trades, tradingPlans, createBackup]);


  // Initialize backup system and restore data IMMEDIATELY on app start
  useEffect(() => {
    console.log('App starting - attempting to restore from backup');
    
    // Try to restore from backup first
    const backupData = restoreBackup();
    
    if (backupData) {
      console.log('✅ Restoring data from backup:', {
        trades: backupData.trades.length,
        plans: backupData.tradingPlans.length,
        reports: backupData.dailyReports.length
      });
      
      setTrades(backupData.trades);
      setTradingPlans(backupData.tradingPlans);
      setDailyReports(backupData.dailyReports);
      setAnalyses(backupData.analyses || []);
    } else {
      console.log('No backup found, starting with empty state');
      setTrades([]);
      setTradingPlans(INITIAL_PLANS);
      setDailyReports([]);
      setAnalyses([]);
    }
    
    setIsInitialized(true);
  }, [restoreBackup]);

  // Immediate backup after initialization to prevent data loss
  useEffect(() => {
    if (isInitialized && (trades.length > 0 || tradingPlans.length > 0 || dailyReports.length > 0)) {
      console.log('🚀 App initialized - creating immediate backup to prevent data loss');
      createBackup(trades, tradingPlans, dailyReports, analyses);
    }
  }, [isInitialized, createBackup]);

  // Setup auto-backup when data changes
  useEffect(() => {
    if (trades.length > 0 || tradingPlans.length > 0 || dailyReports.length > 0) {
      console.log('Data changed, creating immediate backup:', { trades: trades.length, plans: tradingPlans.length, reports: dailyReports.length, analyses: analyses.length });
      createBackup(trades, tradingPlans, dailyReports, analyses);
      
      // Start auto-backup system for continuous protection
      startAutoBackup(trades, tradingPlans, dailyReports, analyses);
    }
  }, [trades, tradingPlans, dailyReports, createBackup, startAutoBackup]);

  // Enhanced handlers with automatic backup
  const handleSaveTradeEnhanced = useCallback((tradeData: Omit<Trade, 'id' | 'pnl' | 'rMultiple'> & { id?: number }) => {
    // Determine if trade is open or closed
    const isOpen = !tradeData.exit || tradeData.exit === 0;
    
    // Only calculate PnL for closed trades
    const pnl = isOpen ? 0 : (tradeData.exit - tradeData.entry) * tradeData.shares * (tradeData.type === 'Short' ? -1 : 1);
    
    // Calculate R-Multiple (Risk/Reward ratio) only if stop loss is provided
    let rMultiple = 0;
    if (tradeData.stopLoss && tradeData.stopLoss > 0) {
      let riskAmount = 0;
      
      if (tradeData.type === 'Long') {
        // For Long: Risk = Entry - Stop Loss
        riskAmount = (tradeData.entry - tradeData.stopLoss) * tradeData.shares;
      } else {
        // For Short: Risk = Stop Loss - Entry
        riskAmount = (tradeData.stopLoss - tradeData.entry) * tradeData.shares;
      }
      
      if (riskAmount > 0) {
        // Calculate R-Multiple based on point movement, not dollar P/L
        let pointMovement = 0;
        
        if (tradeData.type === 'Long') {
          pointMovement = tradeData.exit - tradeData.entry;
        } else {
          pointMovement = tradeData.entry - tradeData.exit;
        }
        
        // R-Multiple = Point Movement / Risk in Points
        let riskInPoints = 0;
        if (tradeData.type === 'Long') {
          riskInPoints = tradeData.entry - tradeData.stopLoss;
        } else {
          riskInPoints = tradeData.stopLoss - tradeData.entry;
        }
        
        if (riskInPoints > 0) {
          rMultiple = pointMovement / riskInPoints;
        }
        
        // Cap R-Multiple to realistic values
        // For losses, max -1.0 (stop loss hit)
        // For profits, allow unlimited values
        if (rMultiple < -1.0) {
          rMultiple = -1.0; // Stop loss hit = -1R
        }
      }
    }
    
    const newTrade: Trade = {
      ...tradeData,
      id: tradeData.id || Date.now(),
      pnl: parseFloat(pnl.toFixed(2)),
      rMultiple: parseFloat(rMultiple.toFixed(2)),
      symbol: tradeData.symbol.toUpperCase(),
      tags: Array.isArray(tradeData.tags) ? tradeData.tags : String(tradeData.tags).split(',').map(t => t.trim()).filter(Boolean),
      mistakes: Array.isArray(tradeData.mistakes) ? tradeData.mistakes : String(tradeData.mistakes).split(',').map(m => m.trim()).filter(Boolean),
      // Add new fields for focuslist and profit-taking
      status: tradeData.status || (isOpen ? 'open' : 'closed'),
      entryDate: tradeData.entryDate || tradeData.date,
      side: tradeData.type === 'Long' ? 'BUY' : 'SELL',
      profitTakingCompleted: tradeData.profitTakingCompleted || false,
      trailingMA: tradeData.trailingMA || '20',
    };

    setTrades(prev => {
      const updatedTrades = editingTrade 
        ? prev.map(t => t.id === editingTrade.id ? newTrade : t)
        : [newTrade, ...prev];
      
      // CRITICAL: Multiple backup strategies to prevent data loss
      console.log('💾 Saving trade - creating multiple backups to prevent data loss:', { 
        isNew: !editingTrade, 
        trades: updatedTrades.length, 
        tradingPlans: tradingPlans.length, 
        dailyReports: dailyReports.length 
      });
      
      // Immediate backup - synchronous if possible
      createBackup(updatedTrades, tradingPlans, dailyReports);
      
      // Additional backup strategies with minimal delay
      setTimeout(() => {
        console.log('🔄 Secondary backup after trade save');
        createBackup(updatedTrades, tradingPlans, dailyReports);
      }, 10);
      
      setTimeout(() => {
        console.log('🔄 Tertiary backup to ensure persistence');
        createBackup(updatedTrades, tradingPlans, dailyReports);
      }, 100);
      
      return updatedTrades;
    });

    setShowTradeModal(false);
    setEditingTrade(null);
  }, [editingTrade, tradingPlans, dailyReports, createBackup]);

  const handleDeleteTradeEnhanced = useCallback((id: number) => {
    if (window.confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      setTrades(prev => {
        const updatedTrades = prev.filter(t => t.id !== id);
        // Immediate backup after deletion
        setTimeout(() => {
          createBackup(updatedTrades, tradingPlans, dailyReports);
        }, 100);
        return updatedTrades;
      });
    }
  }, [tradingPlans, dailyReports, createBackup]);

  const handleSavePlanEnhanced = useCallback((planData: Omit<TradingPlan, 'id' | 'rules'> & { rules: string }) => {
    const newPlan: TradingPlan = {
      ...planData,
      id: Date.now(),
      rules: planData.rules.split('\n').filter(r => r.trim() !== '')
    };
    
    setTradingPlans(prev => {
      const updatedPlans = [...prev, newPlan];
      // Immediate backup after plan change
      setTimeout(() => {
        createBackup(trades, updatedPlans, dailyReports);
      }, 100);
      return updatedPlans;
    });
    
    setShowPlanModal(false);
  }, [trades, dailyReports, createBackup]);

  const handleDeletePlanEnhanced = useCallback((id: number) => {
    if (window.confirm('Are you sure you want to delete this trading plan? This action cannot be undone.')) {
      setTradingPlans(prev => {
        const updatedPlans = prev.filter(p => p.id !== id);
        // Immediate backup after deletion
        setTimeout(() => {
          createBackup(trades, updatedPlans, dailyReports);
        }, 100);
        return updatedPlans;
      });
    }
  }, [trades, dailyReports, createBackup]);

  const handleTradeUpdate = useCallback((updatedTrade: Trade) => {
    setTrades(prev => {
      const updatedTrades = prev.map(t => t.id === updatedTrade.id ? updatedTrade : t);
      
      // CRITICAL: Immediate backup with no delay to prevent data loss
      console.log('🚨 Trade updated - creating immediate backup to prevent data loss');
      createBackup(updatedTrades, tradingPlans, dailyReports);
      
      // Additional backup with slight delay as fallback
      setTimeout(() => {
        console.log('🔄 Secondary backup after trade update');
        createBackup(updatedTrades, tradingPlans, dailyReports);
      }, 50);
      
      return updatedTrades;
    });
  }, [tradingPlans, dailyReports, createBackup]);

  // Handle import from Trade Upload with duplicate prevention
  const handleImportFromUpload = useCallback((importedTrades: Trade[]) => {
    setTrades(prev => {
      console.log('App - handleImportFromUpload called with:', importedTrades.length, 'trades');
      console.log('App - Previous trades count:', prev.length);
      console.log('App - Total PnL of imported trades:', importedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
      
      // Create a map of existing trades by symbol+date+entry+exit for duplicate detection
      const existingTradeMap = new Map<string, Trade>();
      prev.forEach(trade => {
        const key = `${trade.symbol}-${trade.date}-${trade.entry}-${trade.exit}`;
        existingTradeMap.set(key, trade);
      });
      
      // Filter out duplicates from imported trades
      const newTrades = importedTrades.filter(trade => {
        const key = `${trade.symbol}-${trade.date}-${trade.entry}-${trade.exit}`;
        return !existingTradeMap.has(key);
      });
      
      // If we have duplicates, show a message
      const duplicateCount = importedTrades.length - newTrades.length;
      if (duplicateCount > 0) {
        console.log(`⚠️ Skipped ${duplicateCount} duplicate trades`);
        alert(`Import completed! Skipped ${duplicateCount} duplicate trades that were already in your journal.`);
      }
      
      const updatedTrades = [...newTrades, ...prev];
      
      console.log('App - Final trades count:', updatedTrades.length);
      console.log('App - Final total PnL:', updatedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
      console.log(`Importing ${newTrades.length} new XTB trades - creating immediate backup`);
      
      // CRITICAL: Create immediate backup after import to prevent data loss
      createBackup(updatedTrades, tradingPlans, dailyReports);
      
      // Additional backup with delay to ensure persistence
      setTimeout(() => {
        console.log('🔄 Secondary backup after trade import');
        createBackup(updatedTrades, tradingPlans, dailyReports);
      }, 100);
      
      return updatedTrades;
    });
  }, [tradingPlans, dailyReports, createBackup]);

  // Analysis handlers
  const handleSaveAnalysis = useCallback((analysisData: Omit<Analysis, 'id'>) => {
    const newAnalysis: Analysis = {
      ...analysisData,
      id: Date.now()
    };

    setAnalyses(prev => {
      const updatedAnalyses = [newAnalysis, ...prev];
      createBackup(trades, tradingPlans, dailyReports, updatedAnalyses);
      return updatedAnalyses;
    });
  }, [trades, tradingPlans, dailyReports, createBackup]);

  const handleDeleteAnalysis = useCallback((id: number) => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      setAnalyses(prev => {
        const updatedAnalyses = prev.filter(a => a.id !== id);
        createBackup(trades, tradingPlans, dailyReports, updatedAnalyses);
        return updatedAnalyses;
      });
    }
  }, [trades, tradingPlans, dailyReports, createBackup]);

  const handleUpdateAnalysis = useCallback((id: number, updates: Partial<Analysis>) => {
    setAnalyses(prev => {
      const updatedAnalyses = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      createBackup(trades, tradingPlans, dailyReports, updatedAnalyses);
      return updatedAnalyses;
    });
  }, [trades, tradingPlans, dailyReports, createBackup]);

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
        return <JournalView stats={stats} filters={filters} setFilters={setFilters} onEdit={handleEditTrade} onDelete={handleDeleteTradeEnhanced} />;
      case 'analytics':
        return <AnalyticsView stats={stats} trades={trades} />;
      case 'calendar':
        return <CalendarView key={trades.length} trades={trades} onImportTrades={handleImportFromUpload} />;
      case 'planning':
        return <PlanningView plans={tradingPlans} onAddPlan={() => setShowPlanModal(true)} onDeletePlan={handleDeletePlanEnhanced} />;
      case 'reports':
        return <ReportsView reports={dailyReports} onSaveReport={handleSaveReport} />;
      case 'focuslist':
        return <FocusListView analyses={analyses} onSaveAnalysis={handleSaveAnalysis} onDeleteAnalysis={handleDeleteAnalysis} onUpdateAnalysis={handleUpdateAnalysis} />;
      case 'profit-taking':
        return <ProfitTakingView trades={trades} onTradeUpdated={handleTradeUpdate} />;
        case 'stock-analysis':
          return <StockAnalysisView analyses={analyses} onDeleteAnalysis={handleDeleteAnalysis} onUpdateAnalysis={handleUpdateAnalysis} />;
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
          onSave={handleSaveTradeEnhanced}
          trade={editingTrade}
        />
      )}

      {showPlanModal && (
        <PlanModal 
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onSave={handleSavePlanEnhanced}
        />
      )}
    </div>
  );
};

export default App;
