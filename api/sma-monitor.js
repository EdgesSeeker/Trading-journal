// Vercel Serverless Function for SMA Monitoring
// Runs every 5 minutes to check trades and send Discord alerts

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1431993168697757706/IPp6aglCK8nV-e_8EVnAjFVhti41cJUh8ZSWkTgB_vwr2d0V9XKd9Slcm1r9Em35bXP2';

// In-memory storage for trades (in production, use a database)
let trades = [];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Add trade to monitoring
    const { trade } = req.body;
    
    if (!trade || !trade.symbol || !trade.trailingMA) {
      return res.status(400).json({ error: 'Invalid trade data' });
    }

    // Add trade to monitoring list
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

    trades.push(monitoringTrade);
    
    console.log(`✅ Added trade to monitoring: ${monitoringTrade.symbol} with ${monitoringTrade.trailingMA} MA`);
    
    return res.status(200).json({ 
      success: true, 
      message: `Trade ${monitoringTrade.symbol} added to monitoring`,
      trade: monitoringTrade
    });
  }

  if (req.method === 'GET') {
    // Check all trades and send alerts if needed
    console.log(`🔍 Checking ${trades.length} trades for SMA alerts...`);
    
    const results = [];
    
    for (const trade of trades) {
      try {
        const marketData = await fetchMarketData(trade.symbol, trade.trailingMA);
        
        if (marketData) {
          const isLong = trade.side === 'BUY';
          const isAboveMA = marketData.currentPrice > marketData.maValue;
          const sellSignal = isLong ? !isAboveMA : isAboveMA;
          
          trade.lastChecked = new Date().toISOString();
          
          if (sellSignal && !trade.alertSent) {
            // Send Discord alert
            await sendDiscordAlert(trade, marketData);
            trade.alertSent = true;
            
            results.push({
              symbol: trade.symbol,
              action: 'ALERT_SENT',
              currentPrice: marketData.currentPrice,
              maValue: marketData.maValue,
              message: `Alert sent for ${trade.symbol}`
            });
          } else {
            results.push({
              symbol: trade.symbol,
              action: 'CHECKED',
              currentPrice: marketData.currentPrice,
              maValue: marketData.maValue,
              message: `No alert needed for ${trade.symbol}`
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error checking ${trade.symbol}:`, error);
        results.push({
          symbol: trade.symbol,
          action: 'ERROR',
          message: `Error: ${error.message}`
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      tradesChecked: trades.length,
      results: results
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Fetch market data from Yahoo Finance
async function fetchMarketData(symbol, maPeriod) {
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
    const currentPriceData = await fetchYahooCurrentPrice(symbol);
    
    // Fetch historical data for MA calculation
    const historicalData = await fetchYahooHistoricalData(symbol, actualMaPeriod, timeframe);
    const maValue = calculateMovingAverage(historicalData, parseInt(actualMaPeriod));
    
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
async function fetchYahooCurrentPrice(symbol) {
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
async function fetchYahooHistoricalData(symbol, maPeriod, timeframe) {
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
    return closes.slice(-period * 2); // Get enough data for MA calculation
  }
  
  throw new Error('No historical data found');
}

// Calculate moving average
function calculateMovingAverage(prices, period) {
  if (prices.length < period) {
    return prices[prices.length - 1] || 0;
  }
  
  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

// Send Discord alert
async function sendDiscordAlert(trade, marketData) {
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

✅ Automatische Cloud-Überwachung`;

    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        username: 'Cloud SMA Monitor'
      })
    });
    
    console.log(`✅ Discord alert sent for ${trade.symbol}`);
  } catch (error) {
    console.error(`❌ Failed to send Discord alert for ${trade.symbol}:`, error);
  }
}
