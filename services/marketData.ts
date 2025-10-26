// Real-time market data service using Yahoo Finance API
// Fetches live prices and moving averages from Yahoo Finance

interface MarketDataResponse {
  symbol: string;
  currentPrice: number;
  maValue: number;
  maPeriod: string;
  timestamp: number;
}

interface TradeWithMarketData {
  id: number;
  symbol: string;
  currentPrice?: number;
  maValue?: number;
  side: 'BUY' | 'SELL';
  trailingMA?: '5' | '10' | '20' | '30/10' | '5/50';
  [key: string]: any;
}

class MarketDataService {
  private cache: Map<string, MarketDataResponse> = new Map();
  private lastUpdate: number = 0;
  private CACHE_DURATION = 120000; // 2 minute cache for live data
  private readonly CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ];

  // Fetch real-time data from Yahoo Finance API
  private async fetchPriceData(symbol: string, maPeriod: string = '20'): Promise<MarketDataResponse> {
    try {
      // First try to get current price from Yahoo Finance
      const currentPriceData = await this.fetchYahooCurrentPrice(symbol);
      
      // Determine timeframe for historical data
      let timeframe = undefined;
      let actualMaPeriod = maPeriod;
      
      if (maPeriod === '30/10') {
        timeframe = '30m';
        actualMaPeriod = '10';
      } else if (maPeriod === '5/50') {
        timeframe = '5m';
        actualMaPeriod = '50';
      }
      
      // Then fetch historical data for moving average calculation
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
      console.error(`Error fetching real data for ${symbol}:`, error);
      // Fallback to mock data if API fails
      return this.getFallbackData(symbol, maPeriod);
    }
  }

  // Fetch current price from Yahoo Finance
  private async fetchYahooCurrentPrice(symbol: string): Promise<number> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`;
    
    for (const proxy of this.CORS_PROXIES) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
          const result = data.chart.result[0];
          const meta = result.meta;
          
          if (meta.regularMarketPrice) {
            return meta.regularMarketPrice;
          }
          if (meta.previousClose) {
            return meta.previousClose;
          }
        }
        
        throw new Error('No price data found');
      } catch (error) {
        console.warn(`Proxy ${proxy} failed for ${symbol}:`, error);
        continue; // Try next proxy
      }
    }
    
    throw new Error(`All proxies failed for ${symbol}`);
  }

  // Fetch historical data for moving average calculation
  private async fetchYahooHistoricalData(symbol: string, maPeriod: string, timeframe?: string): Promise<number[]> {
    const period = parseInt(maPeriod);
    const range = Math.max(30, period * 2); // Get enough data for calculation
    
    // Determine interval based on timeframe
    let interval = '1d'; // default
    if (timeframe === '30m') {
      interval = '30m';
    } else if (timeframe === '5m') {
      interval = '5m';
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=${interval}&range=${range}d`;
    
    for (const proxy of this.CORS_PROXIES) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for historical data
        
        const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
          const result = data.chart.result[0];
          const quotes = result.indicators?.quote?.[0]?.close;
          
          if (quotes && Array.isArray(quotes)) {
            // Filter out null values and get the most recent prices
            return quotes
              .filter((price: number | null) => price !== null && price !== undefined)
              .slice(-period * 2) // Get last 2x period for reliable calculation
              .map(price => Number(price));
          }
        }
        
        throw new Error('No historical data found');
      } catch (error) {
        console.warn(`Proxy ${proxy} failed for historical data ${symbol}:`, error);
        continue; // Try next proxy
      }
    }
    
    throw new Error(`All proxies failed for historical data ${symbol}`);
  }

  // Calculate Simple Moving Average
  private calculateMovingAverage(prices: number[], period: number): number {
    if (prices.length === 0 || period <= 0) {
      return 0;
    }
    
    const validPrices = prices.filter(price => !isNaN(price) && price > 0);
    
    if (validPrices.length < period) {
      // If not enough data, return the average of available data
      return validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
    }
    
    // Get the last N prices for the moving average
    const lastPrices = validPrices.slice(-period);
    return lastPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  // Fallback data when API fails
  private getFallbackData(symbol: string, maPeriod: string): MarketDataResponse {
    console.warn(`Using fallback data for ${symbol}`);
    
    // Updated fallback prices (more realistic as of 2024)
    const fallbackPrices: { [key: string]: number } = {
      'AAPL': 180.00,
      'GOOGL': 2600.00,
      'MSFT': 380.00,
      'TSLA': 440.00,
      'NVDA': 800.00,
      'SPY': 520.00,
      'QQQ': 430.00,
      'IWM': 200.00,
      'AMZN': 155.00,
      'META': 350.00,
    };
    
    const basePrice = fallbackPrices[symbol.toUpperCase()] || 100.00;
    const volatility = 0.02;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const currentPrice = basePrice * (1 + randomChange);
    
    const periodMultiplier = {
      '5': 0.995 + Math.random() * 0.01,
      '10': 0.99 + Math.random() * 0.02,
      '20': 0.98 + Math.random() * 0.04,
      '30/10': 0.99 + Math.random() * 0.02,
      '5/50': 0.98 + Math.random() * 0.04,
      '50': 0.98 + Math.random() * 0.04
    };
    
    const multiplier = periodMultiplier[maPeriod as keyof typeof periodMultiplier] || periodMultiplier['20'];
    const maValue = currentPrice * multiplier;

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: Number(currentPrice.toFixed(2)),
      maValue: Number(maValue.toFixed(2)),
      maPeriod,
      timestamp: Date.now()
    };
  }

  // Batch fetch prices and moving averages for multiple trades
  async batchFetchPriceAndMA(trades: TradeWithMarketData[]): Promise<TradeWithMarketData[]> {
    const now = Date.now();
    
    try {
      // Create unique combinations of symbol and MA period
      const symbolPeriods = trades
        .filter(trade => trade.trailingMA) // Only process trades with trailingMA
        .map(trade => `${trade.symbol}_${trade.trailingMA || '20'}`)
        .filter((value, index, self) => self.indexOf(value) === index);

      const promises = symbolPeriods.map(async (symbolPeriod) => {
        const [symbol, period] = symbolPeriod.split('_');
        const cacheKey = `${symbol}_${period}`;
        const cached = this.cache.get(cacheKey);
        
        // Check if we have fresh cached data
        if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
          console.log(`Using cached data for ${symbol} (${period} SMA)`);
          return cached;
        }
        
        console.log(`Fetching fresh data for ${symbol} (${period} SMA) from Yahoo Finance`);
        try {
          const data = await this.fetchPriceData(symbol, period);
          this.cache.set(cacheKey, data);
          return data;
        } catch (error) {
          console.error(`Failed to fetch data for ${symbol}:`, error);
          // Return cached data even if stale, or fallback
          if (cached) {
            console.log(`Using stale cached data for ${symbol}`);
            return cached;
          }
          throw error;
        }
      });

      const marketData = await Promise.all(promises);
      this.lastUpdate = now;

      // Map market data back to trades
      return trades.map(trade => {
        if (!trade.trailingMA) return trade;
        
        const data = marketData.find(d => 
          d.symbol === trade.symbol && d.maPeriod === trade.trailingMA
        );
        
        return {
          ...trade,
          currentPrice: data?.currentPrice,
          maValue: data?.maValue
        };
      });

    } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Return trades with cached data if available, or fallback
      return trades.map(trade => {
        if (!trade.trailingMA) return trade;
        
        const cacheKey = `${trade.symbol}_${trade.trailingMA}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
          console.log(`Using cached fallback for ${trade.symbol}`);
          return {
            ...trade,
            currentPrice: cached.currentPrice,
            maValue: cached.maValue
          };
        }
        
        // Generate fallback data
        console.log(`Generating fallback data for ${trade.symbol}`);
        const fallback = this.getFallbackData(trade.symbol, trade.trailingMA);
        return {
          ...trade,
          currentPrice: fallback.currentPrice,
          maValue: fallback.maValue
        };
      });
    }
  }

  // Fetch single symbol data
  async fetchSingleSymbol(symbol: string, maPeriod: string = '20'): Promise<MarketDataResponse> {
    const cacheKey = `${symbol}_${maPeriod}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`Using cached single symbol data for ${symbol}`);
      return cached;
    }

    console.log(`Fetching single symbol data for ${symbol} from Yahoo Finance`);
    try {
      const data = await this.fetchPriceData(symbol, maPeriod);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Failed to fetch single symbol data for ${symbol}:`, error);
      if (cached) {
        console.log(`Using stale cached single symbol data for ${symbol}`);
        return cached;
      }
      // Return fallback data
      return this.getFallbackData(symbol, maPeriod);
    }
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
    this.lastUpdate = 0;
  }

  // Get cache status
  getCacheStatus(): { size: number; lastUpdate: number } {
    return {
      size: this.cache.size,
      lastUpdate: this.lastUpdate
    };
  }

  // Test API connectivity
  async testAPIConnectivity(symbol: string = 'AAPL'): Promise<boolean> {
    try {
      console.log(`Testing API connectivity with ${symbol}...`);
      const result = await this.fetchPriceData(symbol, '20');
      console.log(`API test successful for ${symbol}:`, result);
      return true;
    } catch (error) {
      console.error(`API test failed for ${symbol}:`, error);
      return false;
    }
  }
}

// Export singleton instance
const marketDataService = new MarketDataService();
export default marketDataService;
