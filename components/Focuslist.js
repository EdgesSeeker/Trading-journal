import React, { useState, useEffect } from 'react';
import { CheckSquare, TrendingUp, Target, PlusCircle, DollarSign, Briefcase } from 'lucide-react';
import RoutineChecklist from './RoutineChecklist';
import FocuslistEquityCurve from './FocuslistEquityCurve';
import DailyFocusList from './DailyFocusList';
import NewTradeEntry from './NewTradeEntry';
import ProfitTaking from './ProfitTaking';
import Portfolio from './Portfolio';
import storage from '../utils/storage';

function Focuslist() {
  const [activePage, setActivePage] = useState('routine');
  const [trades, setTrades] = useState([]);

  // Load trades on component mount
  useEffect(() => {
    const loadTrades = async () => {
      try {
        const loadedTrades = await storage.loadTrades();
        if (loadedTrades && loadedTrades.length > 0) {
          setTrades(loadedTrades);
          console.log(`Loaded ${loadedTrades.length} trades`);
        }
      } catch (error) {
        console.error('Error loading trades:', error);
      }
    };
    
    loadTrades();
  }, []);

  // Handle trade updates
  const handleTradeAdded = (newTrade) => {
    const updatedTrades = [...trades, newTrade];
    setTrades(updatedTrades);
    storage.saveTrades(updatedTrades);
  };

  const handleTradeUpdated = (updatedTrade) => {
    const updatedTrades = trades.map(t => 
      t.id === updatedTrade.id ? updatedTrade : t
    );
    setTrades(updatedTrades);
    storage.saveTrades(updatedTrades);
  };

  const handleTradeDeleted = (tradeId) => {
    const updatedTrades = trades.filter(t => t.id !== tradeId);
    setTrades(updatedTrades);
    storage.saveTrades(updatedTrades);
  };

  // Navigation handler
  const handleNavigate = (page) => {
    setActivePage(page);
  };

  // Get open trades for components that need them
  const openTrades = trades.filter(trade => trade.status === 'open');

  const renderTabButton = (page, icon, label) => {
    const Icon = icon;
    const isActive = activePage === page;
    
    return (
      <button
        onClick={() => setActivePage(page)}
        style={{
          padding: '0.875rem 1.75rem',
          backgroundColor: isActive ? '#10b981' : 'transparent',
          color: isActive ? '#fff' : '#94a3b8',
          border: 'none',
          borderRadius: '0.75rem',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s ease',
          boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
        }}
        onMouseOver={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#0f172a';
            e.currentTarget.style.color = '#f8fafc';
          }
        }}
        onMouseOut={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
      >
        <Icon size={18} />
        {label}
      </button>
    );
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Modern Navigation Menu */}
      <div style={{
        marginBottom: '2.5rem'
      }}>
            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '1rem',
                          padding: '0.5rem',
          display: 'inline-flex',
                    gap: '0.5rem',
          border: '2px solid #334155',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          flexWrap: 'wrap'
        }}>
          {renderTabButton('routine', CheckSquare, 'Daily Routine')}
          {renderTabButton('equity', TrendingUp, 'Equity Curve')}
          {renderTabButton('focuslist', Target, 'Focusliste')}
          {renderTabButton('trade-entry', PlusCircle, 'Trade Entry')}
          {renderTabButton('profit-taking', DollarSign, 'Profit Taking')}
          {renderTabButton('portfolio', Briefcase, 'Portfolio')}
        </div>
      </div>

      {/* Conditional Page Rendering */}
      {activePage === 'routine' && <RoutineChecklist />}
      {activePage === 'equity' && <FocuslistEquityCurve />}
      {activePage === 'focuslist' && <DailyFocusList />}
      {activePage === 'trade-entry' && (
        <NewTradeEntry 
          onTradeAdded={handleTradeAdded}
          openTrades={openTrades}
          onNavigate={handleNavigate}
        />
      )}
      {activePage === 'profit-taking' && (
        <ProfitTaking 
          trades={openTrades}
          onTradeUpdated={handleTradeUpdated}
        />
      )}
      {activePage === 'portfolio' && (
        <Portfolio 
          trades={trades}
          onTradeDeleted={handleTradeDeleted}
          onTradeUpdated={handleTradeUpdated}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}

export default Focuslist;
