import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TradingEngine } from '../server/services/tradingEngine';
import { BotConfiguration, InsertTrade } from '@shared/schema';

// Mock dependencies
jest.mock('../server/storage', () => ({
  storage: {
    createTrade: jest.fn(),
    updateTradeStopLoss: jest.fn(),
    closeTrade: jest.fn(),
    getBotConfiguration: jest.fn(),
    updateBotConfiguration: jest.fn(),
    createBotLog: jest.fn(),
    getTrades: jest.fn(),
    getDailyMetrics: jest.fn(),
    createBacktestResult: jest.fn(),
  },
}));

jest.mock('../server/services/marketDataService', () => ({
  MarketDataService: jest.fn().mockImplementation(() => ({
    getLatestMarketData: jest.fn(),
    getTechnicalIndicators: jest.fn(),
    getHistoricalData: jest.fn(),
    on: jest.fn(),
  })),
}));

jest.mock('../server/services/brokerService', () => ({
  BrokerService: jest.fn().mockImplementation(() => ({
    executeTrade: jest.fn(),
  })),
}));

import { storage } from '../server/storage.js';

describe('TradingEngine', () => {
  let tradingEngine: TradingEngine;
  let mockConfig: BotConfiguration;

  beforeEach(() => {
    tradingEngine = new TradingEngine();
    
    mockConfig = {
      id: 'test-config-id',
      userId: 'test-user-id',
      name: 'Test Configuration',
      isActive: false,
      contratos: 1,
      metaLucroDiario: '500.00',
      stopLossPontos: 150,
      maxTradesDia: 3,
      contratoPreferido: 'WIN',
      usarHorarioDinamico: true,
      trailingStopAtivo: true,
      trailingStopPontos: 50,
      horariosEntrada: ['10:00', '13:00', '15:30'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bot Management', () => {
    it('should start a bot successfully', async () => {
      storage.updateBotConfiguration.mockResolvedValue(mockConfig);

      await tradingEngine.startBot('test-user-id', mockConfig);
      
      const status = await tradingEngine.getBotStatus('test-user-id');
      
      expect(status).toBeDefined();
      expect(status?.isActive).toBe(true);
      expect(status?.userId).toBe('test-user-id');
      expect(status?.configId).toBe(mockConfig.id);
      expect(storage.updateBotConfiguration).toHaveBeenCalledWith(
        mockConfig.id, 
        'test-user-id', 
        { isActive: true }
      );
    });

    it('should prevent starting multiple bots for the same user', async () => {
      storage.updateBotConfiguration.mockResolvedValue(mockConfig);
      
      await tradingEngine.startBot('test-user-id', mockConfig);
      
      await expect(
        tradingEngine.startBot('test-user-id', mockConfig)
      ).rejects.toThrow('Bot already active for this user');
    });

    it('should stop a bot successfully', async () => {
      storage.updateBotConfiguration.mockResolvedValue(mockConfig);
      storage.getTrades.mockResolvedValue([]);
      
      await tradingEngine.startBot('test-user-id', mockConfig);
      await tradingEngine.stopBot('test-user-id');
      
      const status = await tradingEngine.getBotStatus('test-user-id');
      
      expect(status).toBeNull();
      expect(storage.updateBotConfiguration).toHaveBeenCalledWith(
        mockConfig.id,
        'test-user-id',
        { isActive: false }
      );
    });

    it('should handle emergency stop', async () => {
      storage.updateBotConfiguration.mockResolvedValue(mockConfig);
      storage.getTrades.mockResolvedValue([]);
      
      await tradingEngine.startBot('test-user-id', mockConfig);
      await tradingEngine.emergencyStop('test-user-id');
      
      const status = await tradingEngine.getBotStatus('test-user-id');
      
      expect(status).toBeNull();
      expect(storage.createBotLog).toHaveBeenCalledWith({
        userId: 'test-user-id',
        botConfigId: mockConfig.id,
        level: 'WARNING',
        message: 'Parada de emergência ativada',
        metadata: {}
      });
    });
  });

  describe('Entry Score Calculation', () => {
    it('should calculate entry score correctly', () => {
      const mockMarketData = {
        close: 112450,
        timestamp: new Date(),
      };

      const mockIndicators = {
        rsi: 55,
        ema9: 112500,
        ema21: 112400,
        macd: 0.15,
        macdSignal: 0.10,
        volatilidade: 100,
      };

      // Access private method for testing
      const result = (tradingEngine as any).calculateEntryScore(mockMarketData, mockIndicators);
      
      expect(result.shouldEnter).toBeDefined();
      expect(result.direction).toMatch(/^(COMPRA|VENDA)$/);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should suggest COMPRA when EMA9 > EMA21', () => {
      const mockMarketData = { close: 112450 };
      const mockIndicators = {
        rsi: 55,
        ema9: 112500,
        ema21: 112400,
        macd: 0.15,
        macdSignal: 0.10,
        volatilidade: 50,
      };

      const result = (tradingEngine as any).calculateEntryScore(mockMarketData, mockIndicators);
      
      expect(result.direction).toBe('COMPRA');
    });

    it('should suggest VENDA when EMA9 < EMA21', () => {
      const mockMarketData = { close: 112450 };
      const mockIndicators = {
        rsi: 55,
        ema9: 112400,
        ema21: 112500,
        macd: -0.15,
        macdSignal: -0.10,
        volatilidade: 50,
      };

      const result = (tradingEngine as any).calculateEntryScore(mockMarketData, mockIndicators);
      
      expect(result.direction).toBe('VENDA');
    });

    it('should require minimum score for entry', () => {
      const mockMarketData = { close: 112450 };
      const mockIndicators = {
        rsi: 85, // Overbought
        ema9: 112400,
        ema21: 112500,
        macd: -0.15,
        macdSignal: -0.10,
        volatilidade: 500, // High volatility
      };

      const result = (tradingEngine as any).calculateEntryScore(mockMarketData, mockIndicators);
      
      expect(result.shouldEnter).toBe(false);
      expect(result.score).toBeLessThan(60);
    });
  });

  describe('Target Points Calculation', () => {
    it('should calculate target points based on configuration', () => {
      const targetPoints = (tradingEngine as any).calculateTargetPoints(mockConfig);
      
      expect(targetPoints).toBeGreaterThan(0);
      // For WIN contract: 500 / 3 trades / 0.20 per point = ~833 points minimum
      expect(targetPoints).toBeGreaterThan(800);
    });

    it('should return at least 1 point', () => {
      const smallConfig = {
        ...mockConfig,
        metaLucroDiario: '1.00',
        maxTradesDia: 10,
      };
      
      const targetPoints = (tradingEngine as any).calculateTargetPoints(smallConfig);
      
      expect(targetPoints).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Contract Specifications', () => {
    it('should return correct WIN contract specs', () => {
      const specs = (tradingEngine as any).getContractSpec('WIN');
      
      expect(specs.nome).toBe('Mini Índice Bovespa');
      expect(specs.valorPonto).toBe(0.20);
      expect(specs.tickSize).toBe(5);
    });

    it('should return correct WDO contract specs', () => {
      const specs = (tradingEngine as any).getContractSpec('WDO');
      
      expect(specs.nome).toBe('Mini Dólar');
      expect(specs.valorPonto).toBe(0.50);
      expect(specs.tickSize).toBe(0.5);
    });

    it('should default to WIN for unknown contracts', () => {
      const specs = (tradingEngine as any).getContractSpec('UNKNOWN');
      
      expect(specs.nome).toBe('Mini Índice Bovespa');
      expect(specs.valorPonto).toBe(0.20);
    });
  });

  describe('Backtesting', () => {
    it('should run backtest with sufficient data', async () => {
      const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - (100 - i) * 60000),
        open: 112000 + Math.random() * 100,
        high: 112050 + Math.random() * 100,
        low: 111950 + Math.random() * 100,
        close: 112000 + Math.random() * 100,
        volume: 1000,
      }));

      const mockMarketDataService = (tradingEngine as any).marketDataService;
      mockMarketDataService.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const result = await tradingEngine.runBacktest(mockConfig, '1mo', '5m');

      expect(result).toBeDefined();
      expect(result.totalTrades).toBeGreaterThanOrEqual(0);
      expect(result.winningTrades).toBeGreaterThanOrEqual(0);
      expect(result.losingTrades).toBeGreaterThanOrEqual(0);
      expect(result.totalReturn).toBeDefined();
      expect(result.averageReturn).toBeDefined();
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
      expect(result.trades).toBeInstanceOf(Array);
    });

    it('should throw error with insufficient data', async () => {
      const mockMarketDataService = (tradingEngine as any).marketDataService;
      mockMarketDataService.getHistoricalData.mockResolvedValue([]);

      await expect(
        tradingEngine.runBacktest(mockConfig, '1d', '5m')
      ).rejects.toThrow('Insufficient market data for backtest');
    });
  });

  describe('Technical Indicators', () => {
    it('should calculate RSI correctly', () => {
      const prices = [100, 102, 101, 105, 104, 108, 107, 106, 110, 109, 108];
      const rsi = (tradingEngine as any).calculateRSI(prices, 9);
      
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });

    it('should calculate EMA correctly', () => {
      const prices = [100, 102, 101, 105, 104, 108, 107, 106, 110, 109];
      const ema = (tradingEngine as any).calculateEMA(prices, 9);
      
      expect(ema).toBeGreaterThan(0);
      expect(ema).toBeCloseTo(105, 0); // Should be close to average
    });

    it('should calculate standard deviation correctly', () => {
      const prices = [100, 100, 100, 100, 100];
      const stdDev = (tradingEngine as any).calculateStandardDeviation(prices);
      
      expect(stdDev).toBe(0); // No deviation in identical values
    });

    it('should handle empty arrays in calculations', () => {
      const emptyPrices: number[] = [];
      
      const ema = (tradingEngine as any).calculateEMA(emptyPrices, 9);
      const stdDev = (tradingEngine as any).calculateStandardDeviation(emptyPrices);
      
      expect(ema).toBe(0);
      expect(stdDev).toBe(0);
    });
  });

  describe('Trailing Stop Logic', () => {
    it('should update trailing stop for long position', async () => {
      const mockTrade = {
        id: 'trade-1',
        tipo: 'COMPRA',
        pontosStopLoss: 112000,
      };

      const newPrice = 112200;
      const trailingPoints = 50;
      const expectedNewStopLoss = newPrice - trailingPoints; // 112150

      await (tradingEngine as any).updateTrailingStop(
        'test-user',
        mockTrade,
        newPrice,
        trailingPoints
      );

      // Should only update if new stop loss is higher
      if (expectedNewStopLoss > mockTrade.pontosStopLoss) {
        expect(storage.updateTradeStopLoss).toHaveBeenCalledWith(
          'trade-1',
          expectedNewStopLoss
        );
      }
    });

    it('should update trailing stop for short position', async () => {
      const mockTrade = {
        id: 'trade-1',
        tipo: 'VENDA',
        pontosStopLoss: 112500,
      };

      const newPrice = 112200;
      const trailingPoints = 50;
      const expectedNewStopLoss = newPrice + trailingPoints; // 112250

      await (tradingEngine as any).updateTrailingStop(
        'test-user',
        mockTrade,
        newPrice,
        trailingPoints
      );

      // Should only update if new stop loss is lower
      if (expectedNewStopLoss < mockTrade.pontosStopLoss) {
        expect(storage.updateTradeStopLoss).toHaveBeenCalledWith(
          'trade-1',
          expectedNewStopLoss
        );
      }
    });
  });
});
