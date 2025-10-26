import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, RefreshCw, DollarSign, Save } from 'lucide-react';
import marketDataService from '../services/marketData';
import type { Trade } from '../types';

// Discord Webhook URL (hardcoded)
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1431993168697757706/IPp6aglCK8nV-e_8EVnAjFVhti41cJUh8ZSWkTgB_vwr2d0V9XKd9Slcm1r9Em35bXP2';

// Cloud monitoring API (Vercel)
const CLOUD_API_URL = 'https://trading-journal-xi-six.vercel.app/api/sma-monitor';

// Alpha Vantage API Key (Backup)
const ALPHA_VANTAGE_API_KEY = 'FW9FIMJDM70YSWRF';

interface ProfitTakingViewProps {
  trades: Trade[];
  onTradeUpdated: (trade: Trade) => void;
}

interface Alert {
  id: string;
  type: string;
  symbol: string;
  message: string;
  trade: Trade;
}

interface ProfitTakingStatus {
  status: string;
  message: string;
  color: string;
}

interface TradeWithMarketData extends Trade {
  currentPrice?: number;
  maValue?: number;
  sellSignal?: boolean;
  lastUpdated?: string;
  error?: string;
  profitTakingCompletedDate?: string;
}

const ProfitTakingView: React.FC<ProfitTakingViewProps> = ({ trades, onTradeUpdated }) => {
  // Manual Sales States
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellNotes, setSellNotes] = useState('');
  
  // Trailing MA States
  const [profitTrades, setProfitTrades] = useState<TradeWithMarketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize with open trades when component mounts or trades change
  useEffect(() => {
    const openTrades = trades.filter(trade => 
      (trade.status === 'open' || !trade.status) && 
      (!trade.exit || trade.exit === 0)
    );
    
    // Map trades to include required fields for profit taking
    const mappedTrades: TradeWithMarketData[] = openTrades.map(trade => ({
      ...trade,
      side: trade.type === 'Long' ? 'BUY' : 'SELL' as 'BUY' | 'SELL',
      entryDate: trade.entryDate || trade.date,
      currentPrice: trade.currentPrice,
      maValue: trade.maValue,
      profitTakingCompleted: trade.profitTakingCompleted || false,
    }));
    
    setProfitTrades(mappedTrades);
  }, [trades]);

  // Calculate business days since trade entry (excluding weekends)
  const getDaysSinceEntry = (trade: Trade): number => {
    if (!trade.entryDate && !trade.date) return 0;
    const entryDate = new Date(trade.entryDate || trade.date);
    const today = new Date();
    
    let businessDays = 0;
    const currentDate = new Date(entryDate);
    
    while (currentDate <= today) {
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return businessDays;
  };

  // Check if profit taking is recommended (after 3 days)
  const getProfitTakingStatus = (trade: Trade): ProfitTakingStatus => {
    const daysSinceEntry = getDaysSinceEntry(trade);
    
    if (daysSinceEntry >= 3) {
      return {
        status: 'profit-taking',
        message: 'Sell 30-50%',
        color: trade.profitTakingCompleted ? '#10b981' : '#f59e0b'
      };
    } else if (daysSinceEntry === 2) {
      return {
        status: 'approaching',
        message: `Day ${daysSinceEntry} - Profit taking tomorrow`,
        color: '#3b82f6'
      };
    } else {
      return {
        status: 'holding',
        message: `Day ${daysSinceEntry} - Hold position`,
        color: '#10b981'
      };
    }
  };

  // Toggle profit taking completion status
  const toggleProfitTakingCompleted = async (trade: Trade) => {
    const updatedTrade: Trade = {
      ...trade,
      profitTakingCompleted: !trade.profitTakingCompleted,
    };
    
    try {
      await onTradeUpdated(updatedTrade);
    } catch (error) {
      console.error('Error updating profit taking status:', error);
    }
  };

  // Generate all alerts at once
  const generateAllAlerts = () => {
    const allAlerts: Alert[] = [];
    
    profitTrades.forEach(trade => {
      const daysSinceEntry = getDaysSinceEntry(trade);
      const profitStatus = getProfitTakingStatus(trade);
      
      // Profit taking alerts
      if (daysSinceEntry >= 3 && profitStatus.status === 'profit-taking' && !trade.profitTakingCompleted) {
        allAlerts.push({
          id: `profit-${trade.id}`,
          type: 'profit-taking',
          symbol: trade.symbol,
          message: `${trade.symbol}: Profit taking recommended! Day ${daysSinceEntry} - Consider selling 30-50%`,
          trade: trade
        });
      }
      
      if (daysSinceEntry === 2 && !trade.profitTakingCompleted) {
        allAlerts.push({
          id: `approaching-${trade.id}`,
          type: 'approaching',
          symbol: trade.symbol,
          message: `${trade.symbol}: Profit taking recommended tomorrow (Day ${daysSinceEntry + 1})`,
          trade: trade
        });
      }
      
      // MA Signal alerts
      if (trade.sellSignal) {
        allAlerts.push({
          id: `signal-${trade.id}`,
          type: 'signal',
          symbol: trade.symbol,
          message: `${trade.symbol}: ${trade.type === 'Long' ? 'Bearish' : 'Bullish'} MA signal detected`,
          trade: trade
        });
      }
    });
    
    setAlerts(allAlerts);
  };

  // Fetch market data
  const fetchMarketData = async () => {
    setLoading(true);
    
    try {
      // Use the market data service to fetch real prices and MAs
      const updatedTrades = await marketDataService.batchFetchPriceAndMA(profitTrades);
      
      // Calculate sell signals based on position type (Long vs Short)
      const tradesWithSignals = updatedTrades.map(trade => {
        if (!trade.currentPrice || !trade.maValue) return trade;
        
        const isLong = trade.side === 'BUY';
        const isAboveMA = trade.currentPrice > trade.maValue;
        
        // For Longs: Sell when price goes below MA
        // For Shorts: Sell when price goes above MA
        const sellSignal = isLong ? !isAboveMA : isAboveMA;
        
        return {
          ...trade,
          sellSignal
        };
      });
      
      setProfitTrades(tradesWithSignals);
      setLastUpdate(new Date());
      
      // Update the original trades with current market data
      tradesWithSignals.forEach(updatedTrade => {
        const originalTrade = trades.find(t => t.id === updatedTrade.id);
        if (originalTrade && (updatedTrade.currentPrice !== originalTrade.currentPrice || updatedTrade.maValue !== originalTrade.maValue)) {
          onTradeUpdated({
            ...originalTrade,
            currentPrice: updatedTrade.currentPrice,
            maValue: updatedTrade.maValue
          });
        }
      });
      
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (profitTrades.length > 0) {
      fetchMarketData();
      generateAllAlerts();
      
      const interval = setInterval(() => {
        fetchMarketData();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [profitTrades.length]);

  // Generate alerts when trades or data changes
  useEffect(() => {
    generateAllAlerts();
  }, [profitTrades]);

  // Handle manual sell
  const handleManualSell = async () => {
    if (!selectedTrade || !sellQuantity || !sellPrice) return;

    const updatedTrade: Trade = {
      ...selectedTrade,
      exit: parseFloat(sellPrice),
      // Update quantity logic here - for now assume partial sell
      status: 'closed' as 'open' | 'closed'
    };

    try {
      await onTradeUpdated(updatedTrade);
      
      // Reset form
      setSelectedTrade(null);
      setSellQuantity('');
      setSellPrice('');
      setSellNotes('');
    } catch (error) {
      console.error('Error updating trade:', error);
    }
  };

  // Test Discord alert function
  const testDiscordAlert = async () => {
    try {
      const testMessage = `🧪 **TEST ALERT** 🧪

**AAPL** ist unter **10-MA** gefallen! (SIMULIERT)

📈 Aktueller Preis: **$145.50**
📊 10-MA: **$148.20**
⏰ Zeit: ${new Date().toLocaleString('de-DE')}

🚨 **SELL SIGNAL**: Kurs unter Moving Average!

✅ Discord-Integration funktioniert!`;

      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: testMessage,
          username: 'Trading Alert Bot'
        })
      });
      
      alert('✅ Test-Discord-Nachricht gesendet!');
      console.log('✅ Test Discord alert sent');
    } catch (error) {
      alert('❌ Fehler beim Senden der Test-Nachricht: ' + error.message);
      console.error('❌ Failed to send test Discord alert:', error);
    }
  };

  // Local SMA Monitor (inline)
  const [localMonitor, setLocalMonitor] = useState<any>(null);

  // Initialize local monitor
  useEffect(() => {
    const monitor = {
      trades: [],
      isRunning: false,
      intervalId: null,

      addTrade(trade: Trade) {
        const monitoringTrade = {
          id: trade.id || Date.now(),
          symbol: trade.symbol.toUpperCase(),
          trailingMA: trade.trailingMA,
          entryPrice: trade.entry,
          side: trade.type === 'Long' ? 'BUY' : 'SELL',
          addedAt: new Date().toISOString(),
          lastChecked: null,
          alertSent: false
        };

        this.trades.push(monitoringTrade);
        console.log(`✅ Added trade to monitoring: ${monitoringTrade.symbol} with ${monitoringTrade.trailingMA} MA`);
        
        if (!this.isRunning) {
          this.startMonitoring();
        }

        return monitoringTrade;
      },

      startMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🚀 Starting intelligent SMA monitoring...');
        
        // Check immediately
        this.checkAllTrades();
        
        // Fast interval: Check every 5 minutes for quick alerts
        this.intervalId = setInterval(() => {
          const now = new Date();
          const hour = now.getHours();
          const day = now.getDay();
          
          // Only check during market hours (9:30 AM - 4:00 PM EST, Monday-Friday)
          const isMarketHours = day >= 1 && day <= 5 && hour >= 9 && hour < 16;
          
          if (isMarketHours) {
            console.log('📈 Market hours - checking trades every 5 minutes...');
            this.checkAllTrades();
          } else {
            console.log('😴 Outside market hours - skipping check');
          }
        }, 5 * 60 * 1000); // 5 minutes for fast alerts
      },

      async checkAllTrades() {
        console.log(`🔍 Checking ${this.trades.length} trades for SMA alerts...`);
        
        for (const trade of this.trades) {
          try {
            const marketData = await this.fetchMarketData(trade.symbol, trade.trailingMA);
            
            if (marketData) {
              const isLong = trade.side === 'BUY';
              const isAboveMA = marketData.currentPrice > marketData.maValue;
              const sellSignal = isLong ? !isAboveMA : isAboveMA;
              
              trade.lastChecked = new Date().toISOString();
              
              if (sellSignal && !trade.alertSent) {
                await this.sendDiscordAlert(trade, marketData);
                trade.alertSent = true;
                
                console.log(`🚨 Alert sent for ${trade.symbol}: ${marketData.currentPrice} vs ${marketData.maValue}`);
              } else {
                console.log(`✅ ${trade.symbol}: ${marketData.currentPrice} vs ${marketData.maValue} - No alert needed`);
              }
            }
          } catch (error) {
            console.error(`❌ Error checking ${trade.symbol}:`, error);
          }
        }
      },

      async fetchMarketData(symbol: string, maPeriod: string) {
        try {
          let timeframe = undefined;
          let actualMaPeriod = maPeriod;
          
          if (maPeriod === '30/10') {
            timeframe = '30m';
            actualMaPeriod = '10';
          } else if (maPeriod === '5/50') {
            timeframe = '5m';
            actualMaPeriod = '50';
          }
          
          // Try Yahoo Finance first
          try {
            const currentPriceData = await this.fetchYahooCurrentPrice(symbol);
            const historicalData = await this.fetchYahooHistoricalData(symbol, actualMaPeriod, timeframe);
            const maValue = this.calculateMovingAverage(historicalData, parseInt(actualMaPeriod));
            
            return {
              symbol: symbol.toUpperCase(),
              currentPrice: Number(currentPriceData.toFixed(2)),
              maValue: Number(maValue.toFixed(2)),
              maPeriod,
              timestamp: Date.now(),
              source: 'Yahoo Finance'
            };
          } catch (yahooError) {
            console.warn(`Yahoo Finance failed for ${symbol}, trying Alpha Vantage backup...`);
            
            // Fallback to Alpha Vantage
            const alphaData = await this.fetchAlphaVantageData(symbol, actualMaPeriod);
            if (alphaData) {
              return {
                ...alphaData,
                source: 'Alpha Vantage (Backup)'
              };
            }
            
            throw yahooError;
          }
        } catch (error) {
          console.error(`Error fetching market data for ${symbol}:`, error);
          return null;
        }
      },

      async fetchYahooCurrentPrice(symbol: string) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`;
        
        // Use CORS proxy
        const corsProxies = [
          'https://api.allorigins.win/raw?url=',
          'https://corsproxy.io/?',
          'https://cors-anywhere.herokuapp.com/'
        ];
        
        for (const proxy of corsProxies) {
          try {
            const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
              const result = data.chart.result[0];
              const currentPrice = result.meta.regularMarketPrice;
              return currentPrice;
            }
            
            throw new Error('No price data found');
          } catch (error) {
            console.log(`Proxy ${proxy} failed, trying next...`);
            continue;
          }
        }
        
        throw new Error('All CORS proxies failed');
      },

      async fetchYahooHistoricalData(symbol: string, maPeriod: string, timeframe?: string) {
        const period = parseInt(maPeriod);
        const range = Math.max(30, period * 2);
        
        let interval = '1d';
        if (timeframe === '30m') {
          interval = '30m';
        } else if (timeframe === '5m') {
          interval = '5m';
        }
        
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=${interval}&range=${range}d`;
        
        // Use CORS proxy
        const corsProxies = [
          'https://api.allorigins.win/raw?url=',
          'https://corsproxy.io/?',
          'https://cors-anywhere.herokuapp.com/'
        ];
        
        for (const proxy of corsProxies) {
          try {
            const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
              const result = data.chart.result[0];
              const quotes = result.indicators.quote[0];
              const closes = quotes.close.filter((price: number) => price !== null);
              return closes.slice(-period * 2);
            }
            
            throw new Error('No historical data found');
          } catch (error) {
            console.log(`Proxy ${proxy} failed for historical data, trying next...`);
            continue;
          }
        }
        
        throw new Error('All CORS proxies failed for historical data');
      },

      // Alpha Vantage Backup API
      async fetchAlphaVantageData(symbol: string, maPeriod: string) {
        try {
          console.log(`🔄 Using Alpha Vantage backup for ${symbol}...`);
          
          // Get current price
          const currentPrice = await this.fetchAlphaVantageCurrentPrice(symbol);
          
          // Get SMA data
          const smaData = await this.fetchAlphaVantageSMA(symbol, maPeriod);
          
          return {
            symbol: symbol.toUpperCase(),
            currentPrice: Number(currentPrice.toFixed(2)),
            maValue: Number(smaData.toFixed(2)),
            maPeriod,
            timestamp: Date.now()
          };
        } catch (error) {
          console.error(`Alpha Vantage backup failed for ${symbol}:`, error);
          return null;
        }
      },

      async fetchAlphaVantageCurrentPrice(symbol: string) {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Alpha Vantage HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          return parseFloat(data['Global Quote']['05. price']);
        }
        
        throw new Error('No price data from Alpha Vantage');
      },

      async fetchAlphaVantageSMA(symbol: string, maPeriod: string) {
        const url = `https://www.alphavantage.co/query?function=SMA&symbol=${symbol}&interval=daily&time_period=${maPeriod}&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Alpha Vantage SMA HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data['Technical Analysis: SMA'] && data['Technical Analysis: SMA']) {
          const smaValues = Object.values(data['Technical Analysis: SMA']);
          if (smaValues.length > 0) {
            const latestSMA = smaValues[0] as any;
            return parseFloat(latestSMA.SMA);
          }
        }
        
        throw new Error('No SMA data from Alpha Vantage');
      },

      calculateMovingAverage(prices: number[], period: number) {
        if (prices.length < period) {
          return prices[prices.length - 1] || 0;
        }
        
        const recentPrices = prices.slice(-period);
        const sum = recentPrices.reduce((acc, price) => acc + price, 0);
        return sum / period;
      },

      async sendDiscordAlert(trade: any, marketData: any) {
        try {
          const isLong = trade.side === 'BUY';
          const signalType = isLong ? 'SELL SIGNAL' : 'BUY SIGNAL';
          const action = isLong ? 'unter' : 'über';
          
          const message = `📊 **SMA Alert** 📊

**${trade.symbol}** ist ${action} **${trade.trailingMA}-MA** gefallen!

📈 Aktueller Preis: **$${marketData.currentPrice.toFixed(2)}**
📊 ${trade.trailingMA}-MA: **$${marketData.maValue.toFixed(2)}**
⏰ Zeit: ${new Date().toLocaleString('de-DE')}

🚨 **${signalType}**: Kurs ${action} Moving Average!

✅ Lokale Überwachung`;

          await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: message,
              username: 'Local SMA Monitor'
            })
          });
          
          console.log(`✅ Discord alert sent for ${trade.symbol}`);
        } catch (error) {
          console.error(`❌ Failed to send Discord alert for ${trade.symbol}:`, error);
        }
      }
    };

    setLocalMonitor(monitor);
  }, []);

  // Upload trade to local monitoring
  const uploadTradeToLocal = async (trade: Trade) => {
    try {
      if (!localMonitor) {
        throw new Error('Local monitor not initialized');
      }
      
      const result = localMonitor.addTrade(trade);
      
      alert(`✅ Trade ${trade.symbol} zur lokalen Überwachung hinzugefügt!\n\nDie Überwachung läuft jetzt im Hintergrund alle 5 Minuten!\n\nDu kannst die App im Hintergrund lassen - Discord-Alerts kommen automatisch!`);
      console.log('✅ Trade added to local monitoring:', result);
    } catch (error) {
      alert('❌ Fehler beim Hinzufügen zur lokalen Überwachung: ' + error.message);
      console.error('❌ Local monitoring error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Profit Taking Dashboard</h3>
          <div className="flex gap-2">
            <button
              onClick={testDiscordAlert}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              🧪 Test Discord Alert
            </button>
            <button
              onClick={() => localMonitor?.checkAllTrades()}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              🔍 Check Now
            </button>
            <button
              onClick={() => {
                const status = localMonitor?.getStatus();
                alert(`📊 Monitoring Status:\n\nRunning: ${status?.isRunning ? '✅ Yes' : '❌ No'}\nTrades: ${status?.tradesCount || 0}\n\nAPI Status:\n- Yahoo Finance: Primary\n- Alpha Vantage: Backup (${ALPHA_VANTAGE_API_KEY.substring(0, 8)}...)`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              📊 Status
            </button>
            <button
              onClick={fetchMarketData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              {loading ? 'Updating...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        
        {lastUpdate && (
          <p className="text-sm text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" size={20} />
            Active Alerts ({alerts.length})
          </h4>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-white">{alert.message}</p>
                    <p className="text-sm text-gray-400 mt-1">Symbol: {alert.symbol}</p>
                  </div>
                  {alert.type === 'profit-taking' && (
                    <button
                      onClick={() => toggleProfitTakingCompleted(alert.trade)}
                      className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trades Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Symbol</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Type</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Entry</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Current</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">MA</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Days</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Status</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Signal</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {profitTrades.map(trade => {
                const status = getProfitTakingStatus(trade);
                return (
                  <tr key={trade.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-white">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.type === 'Long' ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">${trade.entry.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {trade.currentPrice ? `$${trade.currentPrice.toFixed(2)}` : 'Loading...'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {trade.maValue ? (
                        <div>
                          <div>${trade.maValue.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{trade.trailingMA || '20'} SMA</div>
                        </div>
                      ) : 'Loading...'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{getDaysSinceEntry(trade)}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm" style={{ color: status.color }}>
                          {status.message}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {trade.sellSignal ? (
                        <XCircle className="text-red-400" size={16} />
                      ) : (
                        <CheckCircle className="text-green-400" size={16} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedTrade(trade)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Sell
                        </button>
                        {status.status === 'profit-taking' && (
                          <button
                            onClick={() => toggleProfitTakingCompleted(trade)}
                            className={`px-3 py-1 rounded text-xs ${
                              trade.profitTakingCompleted
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                          >
                            {trade.profitTakingCompleted ? 'Completed' : 'Mark Done'}
                          </button>
                        )}
                        <button
                          onClick={() => uploadTradeToLocal(trade)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                          title="Lokale Überwachung (läuft im Hintergrund)"
                        >
                          🔄 Monitor
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Sell Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Manual Sell - {selectedTrade.symbol}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    placeholder="Enter quantity to sell"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Sell Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="Enter sell price"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={sellDate}
                    onChange={(e) => setSellDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={sellNotes}
                    onChange={(e) => setSellNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualSell}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} />
                  Sell Position
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitTakingView;
