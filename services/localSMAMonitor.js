// Local SMA Monitor Service
// Runs locally and sends Discord alerts

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1431993168697757706/IPp6aglCK8nV-e_8EVnAjFVhti41cJUh8ZSWkTgB_vwr2d0V9XKd9Slcm1r9Em35bXP2';

class LocalSMAMonitor {
  constructor() {
    this.trades = [];
    this.isRunning = false;
    this.intervalId = null;
  }

  // Add trade to monitoring
  addTrade(trade) {
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
    
    // Start monitoring if not already running
    if (!this.isRunning) {
      this.startMonitoring();
    }

    return monitoringTrade;
  }

  // Start monitoring every 5 minutes
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting local SMA monitoring...');
    
    // Check immediately
    this.checkAllTrades();
    
    // Then check every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkAllTrades();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Stopped SMA monitoring');
  }

  // Check all trades
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
            // Send Discord alert
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
  }

  // Fetch market data from Yahoo Finance
  async fetchMarketData(symbol, maPeriod) {
    try {
      // Determine timeframe and actual MA period
      let timeframe = undefined;
      let actualMaPeriod = maPeriod;
      
      if (maPeriod === '30/10') {
        timeframe = '30m';
        actualMaPeriod = '10';
      } else if (maPeriod === '5/50') {
        timeframe = '5m';
        actualMaPeriod = '50';
      }
      
      // Fetch current price
      const currentPriceData = await this.fetchYahooCurrentPrice(symbol);
      
      // Fetch historical data for MA calculation
      const historicalData = await this.fetchYahooHistoricalData(symbol, actualMaPeriod, timeframe);
      const maValue = this.calculateMovingAverage(historicalData, parseInt(actualMaPeriod));
      
      return {
        symbol: symbol.toUpperCase(),
        currentPrice: Number(currentPriceData.toFixed(2)),
        maValue: Number(maValue.toFixed(2)),
        maPeriod,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return null;
    }
  }

  // Fetch current price from Yahoo Finance
  async fetchYahooCurrentPrice(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`;
    
    const response = await fetch(url, {
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
  }

  // Fetch historical data for MA calculation
  async fetchYahooHistoricalData(symbol, maPeriod, timeframe) {
    const period = parseInt(maPeriod);
    const range = Math.max(30, period * 2);
    
    let interval = '1d';
    if (timeframe === '30m') {
      interval = '30m';
    } else if (timeframe === '5m') {
      interval = '5m';
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=${interval}&range=${range}d`;
    
    const response = await fetch(url, {
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
      const closes = quotes.close.filter(price => price !== null);
      return closes.slice(-period * 2);
    }
    
    throw new Error('No historical data found');
  }

  // Calculate moving average
  calculateMovingAverage(prices, period) {
    if (prices.length < period) {
      return prices[prices.length - 1] || 0;
    }
    
    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  // Send Discord alert
  async sendDiscordAlert(trade, marketData) {
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

  // Get status
  getStatus() {
    return {
      isRunning: this.isRunning,
      tradesCount: this.trades.length,
      trades: this.trades.map(t => ({
        symbol: t.symbol,
        trailingMA: t.trailingMA,
        lastChecked: t.lastChecked,
        alertSent: t.alertSent
      }))
    };
  }
}

// Create global instance
const smaMonitor = new LocalSMAMonitor();

// Export for use in browser
if (typeof window !== 'undefined') {
  window.smaMonitor = smaMonitor;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = smaMonitor;
}
