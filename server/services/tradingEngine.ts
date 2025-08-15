import { EventEmitter } from 'events';
import { BotConfiguration, Trade, InsertTrade } from '@shared/schema';
import { storage } from '../storage';
import { MarketDataService } from './marketDataService';
import { BrokerService } from './brokerService';

interface BotStatus {
  isActive: boolean;
  userId: string;
  configId: string;
  currentPosition?: Trade;
  dailyTrades: number;
  dailyProfit: number;
  lastActivity: Date;
}

interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalReturn: number;
  averageReturn: number;
  maxDrawdown: number;
  winRate: number;
  trades: any[];
}

export class TradingEngine extends EventEmitter {
  private activeBots: Map<string, BotStatus> = new Map();
  private marketDataService: MarketDataService;
  private brokerService: BrokerService;
  private intervalHandles: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.marketDataService = new MarketDataService();
    this.brokerService = new BrokerService();
  }

  async startBot(userId: string, config: BotConfiguration): Promise<void> {
    if (this.activeBots.has(userId)) {
      throw new Error('Bot already active for this user');
    }

    const botStatus: BotStatus = {
      isActive: true,
      userId,
      configId: config.id,
      dailyTrades: 0,
      dailyProfit: 0,
      lastActivity: new Date()
    };

    this.activeBots.set(userId, botStatus);

    // Update bot configuration as active
    await storage.updateBotConfiguration(config.id, userId, { isActive: true });

    // Start monitoring loop
    const intervalHandle = setInterval(() => {
      this.monitorBot(userId).catch(console.error);
    }, 30000); // Check every 30 seconds

    this.intervalHandles.set(userId, intervalHandle);

    this.emit('botStatusChange', { userId, status: botStatus });

    await this.logBotActivity(userId, config.id, 'INFO', 'Bot iniciado com sucesso');
  }

  async stopBot(userId: string): Promise<void> {
    const botStatus = this.activeBots.get(userId);
    if (!botStatus) {
      throw new Error('No active bot found for this user');
    }

    // Clear monitoring interval
    const intervalHandle = this.intervalHandles.get(userId);
    if (intervalHandle) {
      clearInterval(intervalHandle);
      this.intervalHandles.delete(userId);
    }

    // Close any open positions
    if (botStatus.currentPosition && botStatus.currentPosition.status === 'ATIVO') {
      await this.forceClosePosition(userId, 'BOT_STOPPED');
    }

    // Update bot configuration as inactive
    await storage.updateBotConfiguration(botStatus.configId, userId, { isActive: false });

    this.activeBots.delete(userId);

    this.emit('botStatusChange', { userId, status: { isActive: false } });

    await this.logBotActivity(userId, botStatus.configId, 'INFO', 'Bot parado pelo usuário');
  }

  async emergencyStop(userId: string): Promise<void> {
    const botStatus = this.activeBots.get(userId);
    if (!botStatus) {
      return; // No active bot
    }

    // Force close any open positions immediately
    if (botStatus.currentPosition && botStatus.currentPosition.status === 'ATIVO') {
      await this.forceClosePosition(userId, 'EMERGENCY_STOP');
    }

    // Clear monitoring interval
    const intervalHandle = this.intervalHandles.get(userId);
    if (intervalHandle) {
      clearInterval(intervalHandle);
      this.intervalHandles.delete(userId);
    }

    // Update bot configuration as inactive
    await storage.updateBotConfiguration(botStatus.configId, userId, { isActive: false });

    this.activeBots.delete(userId);

    this.emit('botStatusChange', { userId, status: { isActive: false } });

    await this.logBotActivity(userId, botStatus.configId, 'WARNING', 'Parada de emergência ativada');
  }

  async getBotStatus(userId: string): Promise<BotStatus | null> {
    return this.activeBots.get(userId) || null;
  }

  private async monitorBot(userId: string): Promise<void> {
    const botStatus = this.activeBots.get(userId);
    if (!botStatus) return;

    try {
      const config = await storage.getBotConfiguration(botStatus.configId, userId);
      if (!config) {
        await this.stopBot(userId);
        return;
      }

      // Get current market data
      const marketData = await this.marketDataService.getLatestMarketData(config.contratoPreferido);
      if (!marketData) {
        await this.logBotActivity(userId, config.id, 'WARNING', 'Sem dados de mercado disponíveis');
        return;
      }

      // Update bot status with current position
      const openTrades = await storage.getTrades(userId, { limit: 1, status: 'ATIVO' });
      botStatus.currentPosition = openTrades[0] || undefined;

      // Get daily metrics
      const dailyMetrics = await storage.getDailyMetrics(userId);
      botStatus.dailyTrades = dailyMetrics.totalTrades;
      botStatus.dailyProfit = parseFloat(dailyMetrics.totalProfit || '0');

      // Check if daily limits reached
      if (botStatus.dailyTrades >= config.maxTradesDia) {
        await this.logBotActivity(userId, config.id, 'INFO', 'Limite diário de trades atingido');
        return;
      }

      if (botStatus.dailyProfit >= parseFloat(config.metaLucroDiario)) {
        await this.logBotActivity(userId, config.id, 'INFO', 'Meta diária de lucro atingida');
        await this.stopBot(userId);
        return;
      }

      // Monitor existing position
      if (botStatus.currentPosition) {
        await this.monitorPosition(userId, botStatus.currentPosition, marketData, config);
      } else {
        // Evaluate entry conditions
        await this.evaluateEntry(userId, config, marketData);
      }

      botStatus.lastActivity = new Date();
      this.activeBots.set(userId, botStatus);

    } catch (error) {
      console.error(`Error monitoring bot for user ${userId}:`, error);
      await this.logBotActivity(userId, botStatus.configId, 'ERROR', `Erro no monitoramento: ${error}`);
    }
  }

  private async monitorPosition(userId: string, trade: Trade, marketData: any, config: BotConfiguration): Promise<void> {
    const currentPrice = marketData.close;
    const entryPrice = trade.pontosEntrada;
    const takeProfit = trade.pontosTakeProfit;
    const stopLoss = trade.pontosStopLoss;

    let shouldClose = false;
    let exitReason = '';
    let exitPrice = currentPrice;

    // Check take profit and stop loss
    if (trade.tipo === 'COMPRA') {
      if (currentPrice >= takeProfit) {
        shouldClose = true;
        exitReason = 'TAKE_PROFIT';
        exitPrice = takeProfit;
      } else if (currentPrice <= stopLoss) {
        shouldClose = true;
        exitReason = 'STOP_LOSS';
        exitPrice = stopLoss;
      }
    } else { // VENDA
      if (currentPrice <= takeProfit) {
        shouldClose = true;
        exitReason = 'TAKE_PROFIT';
        exitPrice = takeProfit;
      } else if (currentPrice >= stopLoss) {
        shouldClose = true;
        exitReason = 'STOP_LOSS';
        exitPrice = stopLoss;
      }
    }

    // Update trailing stop if enabled
    if (config.trailingStopAtivo && !shouldClose) {
      await this.updateTrailingStop(userId, trade, currentPrice, config.trailingStopPontos);
    }

    if (shouldClose) {
      await this.closePosition(userId, trade, exitPrice, exitReason);
    }
  }

  private async updateTrailingStop(userId: string, trade: Trade, currentPrice: number, trailingPoints: number): Promise<void> {
    let newStopLoss = trade.pontosStopLoss;
    let updated = false;

    if (trade.tipo === 'COMPRA') {
      const trailingStop = currentPrice - trailingPoints;
      if (trailingStop > trade.pontosStopLoss) {
        newStopLoss = trailingStop;
        updated = true;
      }
    } else { // VENDA
      const trailingStop = currentPrice + trailingPoints;
      if (trailingStop < trade.pontosStopLoss) {
        newStopLoss = trailingStop;
        updated = true;
      }
    }

    if (updated) {
      await storage.updateTradeStopLoss(trade.id, newStopLoss);
      await this.logBotActivity(userId, trade.botConfigId!, 'INFO', 
        `Trailing stop atualizado para ${newStopLoss.toFixed(1)} pontos`);
    }
  }

  private async evaluateEntry(userId: string, config: BotConfiguration, marketData: any): Promise<void> {
    const technicalIndicators = await this.marketDataService.getTechnicalIndicators(
      config.contratoPreferido, '5m'
    );

    if (!technicalIndicators) {
      return;
    }

    const entryScore = this.calculateEntryScore(marketData, technicalIndicators);
    
    if (entryScore.shouldEnter) {
      await this.executeEntry(userId, config, marketData, entryScore.direction);
    }
  }

  private calculateEntryScore(marketData: any, indicators: any): { shouldEnter: boolean; direction: string; score: number } {
    let score = 0;
    let direction = 'COMPRA';

    // RSI analysis
    if (indicators.rsi >= 30 && indicators.rsi <= 70) {
      score += 20;
    } else if (indicators.rsi < 35) {
      score += 15;
      direction = 'COMPRA';
    } else if (indicators.rsi > 65) {
      score += 10;
      direction = 'VENDA';
    }

    // EMA trend analysis
    if (indicators.ema9 > indicators.ema21) {
      score += 20;
      direction = 'COMPRA';
    } else {
      score += 15;
      direction = 'VENDA';
    }

    // MACD analysis
    if (indicators.macd > indicators.macdSignal) {
      score += 15;
    }

    // Volatility check
    if (indicators.volatilidade >= 20 && indicators.volatilidade <= 200) {
      score += 20;
    }

    // Time window check (avoid first and last 30 minutes of trading)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if ((currentHour === 9 && currentMinute >= 30) || 
        (currentHour >= 10 && currentHour < 17) ||
        (currentHour === 17 && currentMinute <= 25)) {
      score += 25;
    }

    return {
      shouldEnter: score >= 60,
      direction,
      score
    };
  }

  private async executeEntry(userId: string, config: BotConfiguration, marketData: any, direction: string): Promise<void> {
    const entryPrice = marketData.close;
    const contractSpec = this.getContractSpec(config.contratoPreferido);
    const targetPoints = this.calculateTargetPoints(config);

    let takeProfit: number;
    let stopLoss: number;

    if (direction === 'COMPRA') {
      takeProfit = entryPrice + targetPoints;
      stopLoss = entryPrice - config.stopLossPontos;
    } else {
      takeProfit = entryPrice - targetPoints;
      stopLoss = entryPrice + config.stopLossPontos;
    }

    // Execute trade through broker service
    const brokerResult = await this.brokerService.executeTrade({
      symbol: config.contratoPreferido,
      side: direction,
      quantity: config.contratos,
      price: entryPrice
    });

    if (!brokerResult.success) {
      await this.logBotActivity(userId, config.id, 'ERROR', 
        `Falha na execução do trade: ${brokerResult.error}`);
      return;
    }

    // Create trade record
    const tradeData: InsertTrade = {
      userId,
      botConfigId: config.id,
      contrato: config.contratoPreferido,
      tipo: direction,
      pontosEntrada: entryPrice,
      pontosTakeProfit: takeProfit,
      pontosStopLoss: stopLoss,
      contratos: config.contratos,
      valorPorPonto: contractSpec.valorPonto,
      status: 'ATIVO'
    };

    const trade = await storage.createTrade(tradeData);

    this.emit('tradeUpdate', { userId, trade });

    await this.logBotActivity(userId, config.id, 'INFO', 
      `Trade executado: ${direction} @ ${entryPrice.toFixed(1)} | TP: ${takeProfit.toFixed(1)} | SL: ${stopLoss.toFixed(1)}`);
  }

  private async closePosition(userId: string, trade: Trade, exitPrice: number, reason: string): Promise<void> {
    const contractSpec = this.getContractSpec(trade.contrato);
    let pointsGained: number;
    
    if (trade.tipo === 'COMPRA') {
      pointsGained = exitPrice - trade.pontosEntrada;
    } else {
      pointsGained = trade.pontosEntrada - exitPrice;
    }

    const result = pointsGained * contractSpec.valorPonto * trade.contratos;

    // Execute close order through broker
    await this.brokerService.executeTrade({
      symbol: trade.contrato,
      side: trade.tipo === 'COMPRA' ? 'VENDA' : 'COMPRA',
      quantity: trade.contratos,
      price: exitPrice
    });

    // Update trade record
    const updatedTrade = await storage.closeTrade(trade.id, userId, {
      pontosSaida: exitPrice,
      motivoSaida: reason,
      resultado: result.toString(),
      horarioSaida: new Date()
    });

    this.emit('tradeUpdate', { userId, trade: updatedTrade });

    const emoji = result > 0 ? "💰" : "❌";
    await this.logBotActivity(userId, trade.botConfigId!, 'INFO', 
      `${emoji} Trade fechado: ${trade.pontosEntrada.toFixed(1)} → ${exitPrice.toFixed(1)} | R$ ${result.toFixed(2)}`);
  }

  private async forceClosePosition(userId: string, reason: string): Promise<void> {
    const openTrades = await storage.getTrades(userId, { limit: 1, status: 'ATIVO' });
    if (openTrades.length === 0) return;

    const trade = openTrades[0];
    const marketData = await this.marketDataService.getLatestMarketData(trade.contrato);
    
    if (marketData) {
      await this.closePosition(userId, trade, marketData.close, reason);
    }
  }

  private calculateTargetPoints(config: BotConfiguration): number {
    const contractSpec = this.getContractSpec(config.contratoPreferido);
    const valuePerPoint = contractSpec.valorPonto * config.contratos;
    const targetValue = parseFloat(config.metaLucroDiario) / config.maxTradesDia;
    return Math.max(1, Math.round(targetValue / valuePerPoint));
  }

  private getContractSpec(contract: string) {
    const specs = {
      'WIN': {
        nome: 'Mini Índice Bovespa',
        valorPonto: 0.20,
        tickSize: 5
      },
      'WDO': {
        nome: 'Mini Dólar',
        valorPonto: 0.50,
        tickSize: 0.5
      }
    };
    return specs[contract as keyof typeof specs] || specs.WIN;
  }

  async runBacktest(config: BotConfiguration, period: string, interval: string): Promise<BacktestResult> {
    const marketData = await this.marketDataService.getHistoricalData(
      config.contratoPreferido, period, interval
    );

    if (!marketData || marketData.length < 50) {
      throw new Error('Insufficient market data for backtest');
    }

    const contractSpec = this.getContractSpec(config.contratoPreferido);
    const trades: any[] = [];
    let currentPosition: any = null;
    let totalReturn = 0;

    for (let i = 21; i < marketData.length; i++) {
      const current = marketData[i];
      const previous = marketData[i - 1];
      
      // Calculate indicators for current candle
      const indicators = this.calculateIndicatorsForCandle(marketData, i);
      
      if (!currentPosition) {
        // Check for entry signal
        const entryScore = this.calculateEntryScore(current, indicators);
        
        if (entryScore.shouldEnter) {
          const targetPoints = this.calculateTargetPoints(config);
          
          currentPosition = {
            entryPrice: current.close,
            entryTime: current.timestamp,
            direction: entryScore.direction,
            takeProfit: entryScore.direction === 'COMPRA' 
              ? current.close + targetPoints 
              : current.close - targetPoints,
            stopLoss: entryScore.direction === 'COMPRA'
              ? current.close - config.stopLossPontos
              : current.close + config.stopLossPontos
          };
        }
      } else {
        // Check for exit conditions
        let shouldExit = false;
        let exitPrice = current.close;
        let exitReason = 'TIME';

        if (currentPosition.direction === 'COMPRA') {
          if (current.close >= currentPosition.takeProfit) {
            shouldExit = true;
            exitPrice = currentPosition.takeProfit;
            exitReason = 'TAKE_PROFIT';
          } else if (current.close <= currentPosition.stopLoss) {
            shouldExit = true;
            exitPrice = currentPosition.stopLoss;
            exitReason = 'STOP_LOSS';
          }
        } else {
          if (current.close <= currentPosition.takeProfit) {
            shouldExit = true;
            exitPrice = currentPosition.takeProfit;
            exitReason = 'TAKE_PROFIT';
          } else if (current.close >= currentPosition.stopLoss) {
            shouldExit = true;
            exitPrice = currentPosition.stopLoss;
            exitReason = 'STOP_LOSS';
          }
        }

        if (shouldExit) {
          const pointsGained = currentPosition.direction === 'COMPRA'
            ? exitPrice - currentPosition.entryPrice
            : currentPosition.entryPrice - exitPrice;
          
          const tradeReturn = pointsGained * contractSpec.valorPonto * config.contratos;
          totalReturn += tradeReturn;

          trades.push({
            entryTime: currentPosition.entryTime,
            exitTime: current.timestamp,
            direction: currentPosition.direction,
            entryPrice: currentPosition.entryPrice,
            exitPrice,
            pointsGained,
            return: tradeReturn,
            reason: exitReason
          });

          currentPosition = null;
        }
      }
    }

    const winningTrades = trades.filter(t => t.return > 0).length;
    const losingTrades = trades.filter(t => t.return <= 0).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
    const averageReturn = trades.length > 0 ? totalReturn / trades.length : 0;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningTotal = 0;
    
    for (const trade of trades) {
      runningTotal += trade.return;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      totalReturn,
      averageReturn,
      maxDrawdown,
      winRate,
      trades
    };
  }

  private calculateIndicatorsForCandle(data: any[], index: number): any {
    if (index < 21) return null;

    const closes = data.slice(index - 20, index + 1).map(d => d.close);
    
    // Calculate RSI
    const rsi = this.calculateRSI(closes, 9);
    
    // Calculate EMAs
    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    
    // Calculate MACD
    const macd = this.calculateEMA(closes, 8) - this.calculateEMA(closes, 17);
    const macdSignal = this.calculateEMA([macd], 6);
    
    // Calculate volatility
    const volatilidade = this.calculateStandardDeviation(closes.slice(-10));

    return {
      rsi,
      ema9,
      ema21,
      macd,
      macdSignal,
      volatilidade
    };
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
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

  private async logBotActivity(userId: string, botConfigId: string, level: string, message: string): Promise<void> {
    await storage.createBotLog({
      userId,
      botConfigId,
      level,
      message,
      metadata: {}
    });
  }
}
