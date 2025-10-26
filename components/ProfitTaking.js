import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, RefreshCw, Bell, X, DollarSign, Save } from 'lucide-react';
import marketDataService from '../services/marketData';

// Discord Webhook URL (hardcoded)
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1431993168697757706/IPp6aglCK8nV-e_8EVnAjFVhti41cJUh8ZSWkTgB_vwr2d0V9XKd9Slcm1r9Em35bXP2';

const ProfitTaking = ({ trades, onTradeUpdated }) => {
  // Manual Sales States
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellNotes, setSellNotes] = useState('');
  
  // Trailing MA States
  const [profitTrades, setProfitTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Discord Webhook URL (hardcoded)
  const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1431993168697757706/IPp6aglCK8nV-e_8EVnAjFVhti41cJUh8ZSWkTgB_vwr2d0V9XKd9Slcm1r9Em35bXP2';

  // Send Discord alert
  const sendDiscordAlert = async (trade) => {
    try {
      const message = `📊 **SMA Alert** 📊

**${trade.symbol}** ist unter **${trade.trailingMA}-MA** gefallen!

📈 Aktueller Preis: **$${parseFloat(trade.currentPrice).toFixed(2)}**
📊 ${trade.trailingMA}-MA: **$${parseFloat(trade.maValue).toFixed(2)}**
⏰ Zeit: ${new Date().toLocaleString('de-DE')}

🚨 **SELL SIGNAL**: Kurs unter Moving Average!`;

      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          username: 'Trading Alert Bot'
        })
      });
      
      console.log(`✅ Discord alert sent for ${trade.symbol}`);
    } catch (error) {
      console.error(`❌ Failed to send Discord alert for ${trade.symbol}:`, error);
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
    if (!trade.entryDate) return 0;
    const entryDate = new Date(trade.entryDate);
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
  const getProfitTakingStatus = (trade) => {
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
  const toggleProfitTakingCompleted = async (trade) => {
    const updatedTrade = {
      ...trade,
      profitTakingCompleted: !trade.profitTakingCompleted,
      profitTakingCompletedDate: !trade.profitTakingCompleted ? new Date().toISOString() : null
    };
    
    try {
      console.log('💾 Updating profit taking status - triggering backup:', updatedTrade);
      await onTradeUpdated(updatedTrade);
      console.log('✅ Profit taking status updated successfully');
    } catch (error) {
      console.error('❌ Error updating profit taking status:', error);
    }
  };



  // Generate all alerts at once
  const generateAllAlerts = () => {
    const allAlerts = [];
    
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
          message: `${trade.symbol}: Profit taking tomorrow! Currently Day ${daysSinceEntry}`,
          trade: trade
        });
      }
      
      // Moving average alerts
      if (trade.sellSignal && !trade.error) {
        const isLong = trade.side === 'BUY';
        const priceAction = isLong ? 'below' : 'above';
        
        allAlerts.push({
          id: `ma-${trade.id}`,
          type: 'sell-signal',
          symbol: trade.symbol,
          message: `${trade.symbol}: Price ($${parseFloat(trade.currentPrice).toFixed(2)}) ${priceAction} ${trade.trailingMA}-day MA ($${parseFloat(trade.maValue).toFixed(2)}) - Consider selling!`,
          timestamp: new Date(),
          tradeId: trade.id
        });
      }
    });
    
    setAlerts(allAlerts);
  };

  // Check for alerts when trades change
  useEffect(() => {
    generateAllAlerts();
  }, [profitTrades]);



  // Get open trades for manual selling
  const openTrades = trades.filter(trade => 
    trade.status === 'open' && parseFloat(trade.quantity) > 0
  );

  // Filter only open trades with trailing MA for automated tracking
  useEffect(() => {
    const openTradesWithMA = trades.filter(trade => 
      trade.status === 'open' && trade.trailingMA
    );
    setProfitTrades(openTradesWithMA);
  }, [trades]);

  // Manual Sales Functions
  const handleTradeSelect = (trade) => {
    setSelectedTrade(trade);
    setSellQuantity('');
    setSellPrice(trade.entryPrice || '');
    setSellDate(new Date().toISOString().split('T')[0]);
    setSellNotes('');
  };

  const handlePartialSell = async () => {
    if (!selectedTrade) return;
    
    const quantity = parseFloat(sellQuantity);
    const price = parseFloat(sellPrice);
    
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity to sell');
      return;
    }
    
    if (quantity > parseFloat(selectedTrade.quantity)) {
      alert('Sell quantity cannot exceed current position size');
      return;
    }
    
    if (!price || price <= 0) {
      alert('Please enter a valid sell price');
      return;
    }

    try {
      // Calculate P&L for the partial sale
      const entryPrice = parseFloat(selectedTrade.entryPrice);
      const pnl = selectedTrade.side === 'BUY' 
        ? (price - entryPrice) * quantity
        : (entryPrice - price) * quantity;

      const partialSale = {
        id: Date.now().toString(),
        originalTradeId: selectedTrade.id,
        symbol: selectedTrade.symbol,
        side: selectedTrade.side === 'BUY' ? 'SELL' : 'BUY',
        quantity: quantity,
        entryPrice: price,
        exitPrice: price,
        entryDate: sellDate,
        exitDate: sellDate,
        status: 'closed',
        pnl: pnl.toFixed(2),
        notes: sellNotes || `Partial sale of ${quantity} shares at $${price}`,
        isPartialSale: true
      };

      // Update the original trade
      const remainingQuantity = parseFloat(selectedTrade.quantity) - quantity;
      const updatedTrade = {
        ...selectedTrade,
        quantity: remainingQuantity.toFixed(2),
        positionSize: (parseFloat(selectedTrade.entryPrice) * remainingQuantity).toFixed(2)
      };

      // Save the partial sale as a new trade - CRITICAL for data integrity
      console.log('💾 Saving partial sale - triggering immediate backup');
      await onTradeUpdated(partialSale);
      
      // Update the original trade - CRITICAL for data integrity
      console.log('💾 Updating original trade - triggering immediate backup');
      await onTradeUpdated(updatedTrade);
      
      // Reset form
      setSellQuantity('');
      setSellPrice('');
      setSellNotes('');
      setSelectedTrade(null);
      
    } catch (error) {
      console.error('Error saving partial sale:', error);
      alert('Error saving partial sale. Please try again.');
    }
  };

  const calculatePnL = () => {
    if (!selectedTrade || !sellQuantity || !sellPrice) return 0;
    
    const quantity = parseFloat(sellQuantity);
    const price = parseFloat(sellPrice);
    const entryPrice = parseFloat(selectedTrade.entryPrice);
    
    if (quantity > 0 && price > 0 && entryPrice > 0) {
      return selectedTrade.side === 'BUY' 
        ? (price - entryPrice) * quantity
        : (entryPrice - price) * quantity;
    }
    return 0;
  };

  // Trailing MA Functions
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
        
        // Send Discord alert if sell signal is triggered
        if (sellSignal && isLong) {
          sendDiscordAlert(trade);
        }
        
        return {
          ...trade,
          sellSignal
        };
      });
      
      setProfitTrades(tradesWithSignals);
      setLastUpdate(new Date());
      
      // Regenerate all alerts after updating trades
      generateAllAlerts();
      
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Fallback to simulated data if API fails
      const updatedTrades = profitTrades.map(trade => {
        const currentPrice = Math.random() * 100 + 50;
        const maValue = currentPrice + (Math.random() - 0.5) * 10;
        const sellSignal = currentPrice < maValue;
        
        return {
          ...trade,
          currentPrice: parseFloat(currentPrice.toFixed(2)),
          maValue: parseFloat(maValue.toFixed(2)),
          sellSignal,
          lastUpdated: new Date().toISOString(),
          error: 'Using simulated data due to API error'
        };
      });
      
      setProfitTrades(updatedTrades);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (profitTrades.length > 0) {
        fetchMarketData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [profitTrades.length]);

  // Initial data fetch
  useEffect(() => {
    if (profitTrades.length > 0) {
      fetchMarketData();
    }
  }, [profitTrades.length]);

  const getMAStyle = (trade) => {
    if (!trade.currentPrice || !trade.maValue) return {};
    
    const isLong = trade.side === 'BUY';
    const isAboveMA = trade.currentPrice > trade.maValue;
    
    // For Longs: Green when above MA, Red when below
    // For Shorts: Green when below MA, Red when above
    const isGoodPosition = isLong ? isAboveMA : !isAboveMA;
    
    return {
      color: isGoodPosition ? '#10b981' : '#ef4444'
    };
  };

  const getSellSignalBadge = (trade) => {
    if (!trade.sellSignal) return null;
    
    return (
      <span style={{
        padding: '0.25rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        color: '#ffffff',
        backgroundColor: '#ef4444',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <AlertTriangle size={12} />
        SELL SIGNAL
      </span>
    );
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getProfitLoss = (trade) => {
    if (!trade.entryPrice) return null;
    
    const entryPrice = parseFloat(trade.entryPrice);
    const quantity = parseFloat(trade.quantity || trade.shares || 0);
    
    if (quantity === 0) return null;
    
    // Try to get live data from Dashboard first
    const liveData = window.dashboardLiveData || {};
    const liveTradeData = liveData[trade.symbol];
    
    let currentPrice;
    if (liveTradeData && liveTradeData.price) {
      currentPrice = parseFloat(liveTradeData.price);
    } else {
      currentPrice = parseFloat(trade.currentPrice || trade.entryPrice); // Fallback to entry price if no current price
    }
    
    if (trade.side === 'BUY') {
      return (currentPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - currentPrice) * quantity;
    }
  };

  const pnl = calculatePnL();
  const maxQuantity = selectedTrade ? parseFloat(selectedTrade.quantity) : 0;

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      color: '#f8fafc',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem 2rem'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            padding: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#f8fafc',
              margin: '0 0 1rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Bell size={20} />
              Trading Alerts ({alerts.length})
            </h3>
            
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {alerts.map(alert => {
                    const isProfitTaking = alert.type === 'profit-taking';
                    const isApproaching = alert.type === 'approaching';
                    const isSellSignal = alert.type === 'sell-signal';
                    
                    const backgroundColor = isProfitTaking ? '#1e293b' : 
                                          isApproaching ? '#1e293b' : 
                                          '#1e293b';
                    const borderColor = isProfitTaking ? '#f59e0b' : 
                                       isApproaching ? '#3b82f6' : 
                                       '#ef4444';
                    const textColor = isProfitTaking ? '#f59e0b' : 
                                     isApproaching ? '#3b82f6' : 
                                     '#ef4444';
                    
                    return (
                      <div key={alert.id} style={{
                        backgroundColor: backgroundColor,
                        border: `1px solid ${borderColor}`,
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          color: textColor,
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1rem' }}>
                            {isProfitTaking ? '💰' : isApproaching ? '⏰' : '⚠️'}
                          </span>
                          {alert.message}
                        </div>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: textColor,
                            cursor: 'pointer',
                            padding: '0.25rem'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        
        {/* Manual Sales Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#f8fafc',
            marginBottom: '1.5rem'
          }}>
            Manual Sales
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: '2rem'
          }}>
            {/* Left Side - Trade List */}
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#f8fafc',
                marginBottom: '1rem'
              }}>
                Open Positions ({openTrades.length})
              </h3>
              
              {openTrades.length === 0 ? (
                <div style={{
                  backgroundColor: '#1e293b',
                  padding: '3rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155',
                  textAlign: 'center'
                }}>
                  <TrendingDown style={{
                    width: '3rem',
                    height: '3rem',
                    color: '#94a3b8',
                    margin: '0 auto 1rem'
                  }} />
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#f8fafc',
                    marginBottom: '0.5rem'
                  }}>
                    No Open Positions
                  </h3>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.875rem'
                  }}>
                    All your positions are closed. Add new trades to see them here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {openTrades.map((trade) => {
                    const pnl = getProfitLoss(trade);
                    const pnlColor = pnl > 0 ? '#10b981' : pnl < 0 ? '#ef4444' : '#94a3b8';
                    const isSelected = selectedTrade && selectedTrade.id === trade.id;
                    
                    return (
                      <div 
                        key={trade.id} 
                        onClick={() => handleTradeSelect(trade)}
                        style={{
                          backgroundColor: isSelected ? '#334155' : '#1e293b',
                          borderRadius: '0.5rem',
                          border: '1px solid #334155',
                          padding: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderColor: isSelected ? '#3b82f6' : '#334155'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              marginBottom: '0.5rem'
                            }}>
                              <h4 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#f8fafc',
                                margin: 0
                              }}>
                                {trade.symbol}
                              </h4>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: trade.side === 'BUY' ? '#10b981' : '#ef4444',
                                backgroundColor: trade.side === 'BUY' ? '#065f46' : '#7f1d1d'
                              }}>
                                {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#94a3b8'
                            }}>
                              {trade.quantity} shares @ {parseFloat(trade.entryPrice).toFixed(2)}€
                            </div>
                          </div>
                          
                          <div style={{
                            textAlign: 'right'
                          }}>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: '700',
                              color: pnlColor,
                              marginBottom: '0.25rem'
                            }}>
                              {pnl ? `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}` : trade.currentPrice ? 'N/A' : 'No Price Data'}
                            </div>
                            {pnl && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: pnlColor
                              }}>
                                {((pnl / (parseFloat(trade.entryPrice) * parseFloat(trade.quantity || trade.shares))) * 100).toFixed(2)}%
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side - Sales Form */}
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#f8fafc',
                marginBottom: '1rem'
              }}>
                Sell Position
              </h3>
              
              {selectedTrade ? (
                <div style={{
                  backgroundColor: '#1e293b',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155'
                }}>
                  <div style={{
                    backgroundColor: '#334155',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#94a3b8',
                      marginBottom: '0.5rem'
                    }}>
                      Selected Position
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: '#f8fafc',
                      fontWeight: '500'
                    }}>
                      {selectedTrade.symbol} - {selectedTrade.quantity} shares
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Sell Quantity */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                      }}>
                        Quantity to Sell (max: {maxQuantity})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(e.target.value)}
                        max={maxQuantity}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#334155',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#f8fafc',
                          fontSize: '0.875rem'
                        }}
                        placeholder="Enter quantity"
                      />
                    </div>

                    {/* Sell Price */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                      }}>
                        Sell Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#334155',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#f8fafc',
                          fontSize: '0.875rem'
                        }}
                        placeholder="Enter sell price"
                      />
                    </div>

                    {/* Sell Date */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                      }}>
                        Sell Date
                      </label>
                      <input
                        type="date"
                        value={sellDate}
                        onChange={(e) => setSellDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#334155',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#f8fafc',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>

                    {/* P&L Preview */}
                    {pnl !== 0 && (
                      <div style={{
                        backgroundColor: '#334155',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#94a3b8',
                          marginBottom: '0.5rem'
                        }}>
                          Estimated P&L:
                        </div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: pnl >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}€
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#94a3b8',
                        marginBottom: '0.5rem'
                      }}>
                        Profit-Taking Notes
                      </label>
                      <textarea
                        value={sellNotes}
                        onChange={(e) => setSellNotes(e.target.value)}
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#334155',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#f8fafc',
                          fontSize: '0.875rem',
                          resize: 'vertical'
                        }}
                        placeholder="Add notes about this sale..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginTop: '1rem'
                    }}>
                      <button
                        onClick={() => setSelectedTrade(null)}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: 'transparent',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePartialSell}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: '#ef4444',
                          border: 'none',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Save size={16} />
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#1e293b',
                  padding: '3rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155',
                  textAlign: 'center'
                }}>
                  <TrendingDown style={{
                    width: '3rem',
                    height: '3rem',
                    color: '#94a3b8',
                    margin: '0 auto 1rem'
                  }} />
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#f8fafc',
                    marginBottom: '0.5rem'
                  }}>
                    Select a Trade
                  </h3>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.875rem'
                  }}>
                    Click on a trade from the list to start selling
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trailing MA Section */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#f8fafc',
              margin: 0
            }}>
              Trailing Moving Averages
            </h2>
            
            <button
              onClick={testDiscordAlert}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                borderRadius: '0.5rem',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🧪 Test Discord Alert
            </button>
          </div>
          
          {profitTrades.length === 0 ? (
            <div style={{
              backgroundColor: '#1e293b',
              padding: '3rem',
              borderRadius: '0.5rem',
              border: '1px solid #334155',
              textAlign: 'center'
            }}>
              <TrendingUp style={{
                width: '3rem',
                height: '3rem',
                color: '#94a3b8',
                margin: '0 auto 1rem'
              }} />
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#f8fafc',
                marginBottom: '0.5rem'
              }}>
                No Active Trades with Trailing MA
              </h3>
              <p style={{
                color: '#94a3b8',
                fontSize: '0.875rem'
              }}>
                Add trailing moving averages to your open trades to see them here
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {profitTrades.map((trade) => {
                const pnl = getProfitLoss(trade);
                const pnlColor = pnl > 0 ? '#10b981' : pnl < 0 ? '#ef4444' : '#94a3b8';
                
                return (
                  <div key={trade.id} style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.5rem',
                    border: '1px solid #334155',
                    overflow: 'hidden'
                  }}>
                    {/* Trade Header */}
                    <div style={{
                      padding: '1.5rem',
                      borderBottom: '1px solid #334155',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          marginBottom: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#f8fafc'
                          }}>
                            {trade.symbol}
                          </h3>
                          {getSellSignalBadge(trade)}
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: trade.side === 'BUY' ? '#10b981' : '#ef4444',
                            backgroundColor: trade.side === 'BUY' ? '#065f46' : '#7f1d1d'
                          }}>
                            {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
                          </span>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2rem',
                          fontSize: '0.875rem',
                          color: '#94a3b8',
                          flexWrap: 'wrap'
                        }}>
                          <span>Entry: {trade.entryDate}</span>
                          <span>Entry Price: ${parseFloat(trade.entryPrice).toFixed(2)}</span>
                          <span>Shares: {trade.quantity || trade.shares}</span>
                          <span>Trailing: {trade.trailingMA}-Day MA</span>
                        </div>
                      </div>
                      
                      <div style={{
                        textAlign: 'right',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: '700',
                          color: pnlColor,
                          marginBottom: '0.5rem'
                        }}>
                          {pnl ? `${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}` : trade.currentPrice ? 'N/A' : 'No Price Data'}
                        </div>
                        {pnl && (
                          <div style={{
                            fontSize: '1rem',
                            color: pnlColor
                          }}>
                            {((pnl / (parseFloat(trade.entryPrice) * parseFloat(trade.quantity || trade.shares))) * 100).toFixed(2)}%
                          </div>
                        )}

                      </div>
                    </div>

                    {/* MA Analysis */}
                    <div style={{
                      padding: '1.5rem',
                      display: 'grid',
                      gap: '1rem'
                    }}>
                      
                      {/* Error Message */}
                      {trade.error && (
                        <div style={{
                          backgroundColor: '#7f1d1d',
                          border: '1px solid #ef4444',
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            color: '#fecaca',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <AlertTriangle size={16} />
                            {trade.error}
                          </div>
                        </div>
                      )}
                      
                      <div style={{
                        backgroundColor: '#334155',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #475569'
                      }}>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#f8fafc',
                          marginBottom: '1rem'
                        }}>
                          📊 Moving Average & Profit-Taking Analysis
                        </h4>
                        
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem'
                        }}>
                          <div>
                            <div style={{
                              color: '#94a3b8',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              marginBottom: '0.25rem'
                            }}>
                              Current Price
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              color: trade.error ? '#ef4444' : '#f8fafc',
                              fontWeight: '600',
                              fontFamily: 'Geist Mono, monospace'
                            }}>
                              {trade.currentPrice ? `$${parseFloat(trade.currentPrice).toFixed(2)}` : trade.error ? 'Error' : 'Loading...'}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{
                              color: '#94a3b8',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              marginBottom: '0.25rem'
                            }}>
                              Days Since Entry
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              color: '#f8fafc',
                              fontWeight: '600',
                              fontFamily: 'Geist Mono, monospace'
                            }}>
                              Day {getDaysSinceEntry(trade)}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginTop: '0.25rem'
                            }}>
                              <div style={{
                                fontSize: '0.875rem',
                                color: getProfitTakingStatus(trade).color,
                                fontWeight: '500'
                              }}>
                                {getProfitTakingStatus(trade).message}
                              </div>
                              {getDaysSinceEntry(trade) >= 3 && (
                                <button
                                  onClick={() => toggleProfitTakingCompleted(trade)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title={trade.profitTakingCompleted ? 'Profit taking completed' : 'Mark as completed'}
                                >
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: `2px solid ${trade.profitTakingCompleted ? '#10b981' : '#6b7280'}`,
                                    borderRadius: '3px',
                                    backgroundColor: trade.profitTakingCompleted ? '#10b981' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {trade.profitTakingCompleted && (
                                      <span style={{
                                        color: '#ffffff',
                                        fontSize: '10px',
                                        fontWeight: 'bold'
                                      }}>
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{
                              color: '#94a3b8',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              marginBottom: '0.25rem'
                            }}>
                              {trade.trailingMA}-Day MA
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              color: trade.error ? '#ef4444' : '#f8fafc',
                              fontWeight: '600',
                              fontFamily: 'Geist Mono, monospace'
                            }}>
                              {trade.maValue ? `$${parseFloat(trade.maValue).toFixed(2)}` : trade.error ? 'Error' : 'Loading...'}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{
                              color: '#94a3b8',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              marginBottom: '0.25rem'
                            }}>
                              Distance to MA
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              ...getMAStyle(trade),
                              fontWeight: '600',
                              fontFamily: 'Geist Mono, monospace'
                            }}>
                              {trade.currentPrice && trade.maValue ? 
                                `$${(trade.currentPrice - trade.maValue).toFixed(2)}` : 
                                'Loading...'
                              }
                            </div>
                          </div>
                          
                          <div>
                            <div style={{
                              color: '#94a3b8',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              marginBottom: '0.25rem'
                            }}>
                              Distance to MA (%)
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              ...getMAStyle(trade),
                              fontWeight: '600',
                              fontFamily: 'Geist Mono, monospace'
                            }}>
                              {trade.currentPrice && trade.maValue ? 
                                `${((trade.currentPrice - trade.maValue) / trade.maValue * 100).toFixed(2)}%` : 
                                'Loading...'
                              }
                            </div>
                          </div>
                          
                                                      <div>
                              <div style={{
                                color: '#94a3b8',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.25rem'
                              }}>
                                Moving Average Status
                              </div>
                              <div style={{
                                fontSize: '1.25rem',
                                color: trade.sellSignal ? '#ef4444' : '#10b981',
                                fontWeight: '600',
                                fontFamily: 'Geist Mono, monospace'
                              }}>
                                {trade.sellSignal ? 'Sell Position' : 'Hold Position'}
                              </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProfitTaking;
