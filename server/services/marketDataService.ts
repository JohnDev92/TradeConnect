import { EventEmitter } from 'events';
import { MarketData, TechnicalIndicators } from '@shared/schema';
import { storage } from '../storage';

interface LatestMarketData {
  symbol: string;
  close: number;
  timestamp: Date;
  volume?: number;
}

export class MarketDataService extends EventEmitter {
  private dataIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isStreaming = false;

  constructor() {
    super();
    this.startRealTimeDataStream();
  }

  async getMarketData(symbol: string, timeframe: string, limit: number): Promise<MarketData[]> {
    try {
      return await storage.getMarketData(symbol, timeframe, limit);
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return [];
    }
  }

  async getLatestMarketData(symbol: string): Promise<LatestMarketData | null> {
    try {
      const data = await storage.getMarketData(symbol, '1m', 1);
      if (data.length === 0) return null;

      const latest = data[0];
      return {
        symbol: latest.symbol,
        close: latest.close,
        timestamp: latest.timestamp,
        volume: latest.volume || undefined
      };
    } catch (error) {
      console.error(`Error fetching latest market data for ${symbol}:`, error);
      return null;
    }
  }

  async getTechnicalIndicators(symbol: string, timeframe: string): Promise<TechnicalIndicators | null> {
    try {
      return await storage.getLatestTechnicalIndicators(symbol, timeframe);
    } catch (error) {
      console.error(`Error fetching technical indicators for ${symbol}:`, error);
      return null;
    }
  }

  async getHistoricalData(symbol: string, period: string, interval: string): Promise<MarketData[]> {
    try {
      // Convert period to limit (approximate)
      const periodLimits: { [key: string]: number } = {
        '1d': 288,    // 1 day of 5m candles
        '1w': 2016,   // 1 week of 5m candles
        '1mo': 8640,  // 1 month of 5m candles
        '3mo': 25920, // 3 months of 5m candles
        '6mo': 51840, // 6 months of 5m candles
        '1y': 103680  // 1 year of 5m candles
      };

      const limit = periodLimits[period] || 8640;
      
      // In a real implementation, you would fetch from Yahoo Finance or another data provider
      // For now, we'll generate some sample data for testing
      return await this.generateSampleHistoricalData(symbol, limit, interval);
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  private async generateSampleHistoricalData(symbol: string, limit: number, interval: string): Promise<MarketData[]> {
    const data: MarketData[] = [];
    const now = new Date();
    
    // Get interval in minutes
    const intervalMinutes = this.parseInterval(interval);
    
    // Base price for the symbol
    const basePrice = symbol === 'WIN' ? 112000 : symbol === 'WDO' ? 5.20 : 100;
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * intervalMinutes * 60000));
      
      // Generate realistic price movement
      const volatility = 0.005; // 0.5% volatility
      const trend = Math.sin(i / 100) * 0.001; // Small trend component
      const random = (Math.random() - 0.5) * volatility;
      
      const priceChange = basePrice * (trend + random);
      const open = basePrice + priceChange;
      const high = open + Math.abs(priceChange) * Math.random();
      const low = open - Math.abs(priceChange) * Math.random();
      const close = low + (high - low) * Math.random();
      
      data.push({
        id: `${symbol}_${timestamp.getTime()}`,
        symbol,
        timeframe: interval,
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000) + 1000,
        createdAt: new Date()
      });
    }
    
    return data.reverse(); // Return in chronological order
  }

  private parseInterval(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    
    switch (unit) {
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 24 * 60;
      default: return 5; // Default to 5 minutes
    }
  }

  private startRealTimeDataStream(): void {
    if (this.isStreaming) return;
    
    this.isStreaming = true;
    
    // Stream WIN data
    const winInterval = setInterval(() => {
      this.updateMarketData('WIN').catch(console.error);
    }, 5000); // Update every 5 seconds
    
    // Stream WDO data
    const wdoInterval = setInterval(() => {
      this.updateMarketData('WDO').catch(console.error);
    }, 5000);

    this.dataIntervals.set('WIN', winInterval);
    this.dataIntervals.set('WDO', wdoInterval);
  }

  private async updateMarketData(symbol: string): Promise<void> {
    try {
      // In a real implementation, you would fetch from Yahoo Finance or another real-time data provider
      // For now, we'll simulate real-time data updates
      
      const lastData = await this.getLatestMarketData(symbol);
      const basePrice = lastData?.close || (symbol === 'WIN' ? 112000 : 5.20);
      
      // Generate realistic price movement
      const volatility = 0.001; // 0.1% volatility
      const change = (Math.random() - 0.5) * volatility * basePrice;
      const newPrice = basePrice + change;
      
      const marketData = {
        symbol,
        timeframe: '1m',
        timestamp: new Date(),
        open: basePrice,
        high: Math.max(basePrice, newPrice),
        low: Math.min(basePrice, newPrice),
        close: newPrice,
        volume: Math.floor(Math.random() * 1000) + 100
      };

      // Save to database
      await storage.saveMarketData(marketData);
      
      // Calculate and save technical indicators
      await this.calculateAndSaveTechnicalIndicators(symbol, '1m');
      
      // Emit event for WebSocket broadcast
      this.emit('marketData', {
        symbol,
        price: newPrice,
        change: change,
        changePercent: (change / basePrice) * 100,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`Error updating market data for ${symbol}:`, error);
    }
  }

  private async calculateAndSaveTechnicalIndicators(symbol: string, timeframe: string): Promise<void> {
    try {
      // Get last 50 candles for calculation
      const historicalData = await storage.getMarketData(symbol, timeframe, 50);
      
      if (historicalData.length < 21) {
        return; // Not enough data for calculations
      }

      const closes = historicalData.map(d => d.close);
      const volumes = historicalData.map(d => d.volume || 0);
      
      // Calculate RSI (9 period)
      const rsi = this.calculateRSI(closes, 9);
      
      // Calculate EMAs
      const ema9 = this.calculateEMA(closes, 9);
      const ema21 = this.calculateEMA(closes, 21);
      
      // Calculate MACD
      const macd = this.calculateEMA(closes, 8) - this.calculateEMA(closes, 17);
      const macdSignal = this.calculateEMA([macd], 6);
      
      // Calculate volatility (10 period standard deviation)
      const volatilidade = this.calculateStandardDeviation(closes.slice(-10));
      
      // Calculate volume ratio
      const volumeMA = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
      const volumeRatio = volumes[volumes.length - 1] / volumeMA;

      const indicators = {
        symbol,
        timeframe,
        timestamp: new Date(),
        rsi,
        ema9,
        ema21,
        macd,
        macdSignal,
        volatilidade,
        volumeRatio
      };

      await storage.saveTechnicalIndicators(indicators);

    } catch (error) {
      console.error(`Error calculating technical indicators for ${symbol}:`, error);
    }
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateStandardDeviation(prices: number[]): number {
    if (prices.length === 0) return 0;

    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance);
  }

  stopRealTimeDataStream(): void {
    this.dataIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.dataIntervals.clear();
    this.isStreaming = false;
  }
}
