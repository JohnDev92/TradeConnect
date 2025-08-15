import {
  users,
  botConfigurations,
  trades,
  apiConnections,
  marketData,
  technicalIndicators,
  botLogs,
  backtestResults,
  type User,
  type UpsertUser,
  type BotConfiguration,
  type InsertBotConfiguration,
  type Trade,
  type InsertTrade,
  type ApiConnection,
  type InsertApiConnection,
  type MarketData,
  type TechnicalIndicators,
  type BotLog,
  type BacktestResult,
  type InsertBacktestResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Bot Configuration operations
  getBotConfigurations(userId: string): Promise<BotConfiguration[]>;
  getBotConfiguration(id: string, userId: string): Promise<BotConfiguration | undefined>;
  createBotConfiguration(config: InsertBotConfiguration): Promise<BotConfiguration>;
  updateBotConfiguration(id: string, userId: string, updates: Partial<InsertBotConfiguration>): Promise<BotConfiguration>;
  deleteBotConfiguration(id: string, userId: string): Promise<void>;

  // Trade operations
  getTrades(userId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  closeTrade(id: string, userId: string, updates: { pontosSaida: number; motivoSaida: string; resultado: string; horarioSaida: Date }): Promise<Trade>;
  updateTradeStopLoss(id: string, newStopLoss: number): Promise<void>;

  // API Connection operations
  getApiConnections(userId: string): Promise<ApiConnection[]>;
  getApiConnection(id: string, userId: string): Promise<ApiConnection | undefined>;
  createApiConnection(connection: InsertApiConnection): Promise<ApiConnection>;
  updateApiConnectionStatus(id: string, updates: { connectionStatus: string; errorMessage?: string | null; lastConnectionTest: Date }): Promise<void>;

  // Market Data operations
  getMarketData(symbol: string, timeframe: string, limit: number): Promise<MarketData[]>;
  saveMarketData(data: Omit<MarketData, 'id' | 'createdAt'>): Promise<void>;

  // Technical Indicators operations
  getLatestTechnicalIndicators(symbol: string, timeframe: string): Promise<TechnicalIndicators | undefined>;
  saveTechnicalIndicators(indicators: Omit<TechnicalIndicators, 'id' | 'createdAt'>): Promise<void>;

  // Bot Logs operations
  createBotLog(log: Omit<BotLog, 'id' | 'timestamp'>): Promise<void>;

  // Backtest operations
  createBacktestResult(result: InsertBacktestResult): Promise<BacktestResult>;
  getBacktestResults(userId: string): Promise<BacktestResult[]>;

  // Metrics operations
  getDailyMetrics(userId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Bot Configuration operations
  async getBotConfigurations(userId: string): Promise<BotConfiguration[]> {
    return await db
      .select()
      .from(botConfigurations)
      .where(eq(botConfigurations.userId, userId))
      .orderBy(desc(botConfigurations.createdAt));
  }

  async getBotConfiguration(id: string, userId: string): Promise<BotConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(botConfigurations)
      .where(and(eq(botConfigurations.id, id), eq(botConfigurations.userId, userId)));
    return config;
  }

  async createBotConfiguration(config: InsertBotConfiguration): Promise<BotConfiguration> {
    const [created] = await db
      .insert(botConfigurations)
      .values(config)
      .returning();
    return created;
  }

  async updateBotConfiguration(id: string, userId: string, updates: Partial<InsertBotConfiguration>): Promise<BotConfiguration> {
    const [updated] = await db
      .update(botConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(botConfigurations.id, id), eq(botConfigurations.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBotConfiguration(id: string, userId: string): Promise<void> {
    await db
      .delete(botConfigurations)
      .where(and(eq(botConfigurations.id, id), eq(botConfigurations.userId, userId)));
  }

  // Trade operations
  async getTrades(userId: string, options: { limit?: number; offset?: number; status?: string } = {}): Promise<Trade[]> {
    const { limit = 50, offset = 0, status } = options;
    
    let query = db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId));

    if (status) {
      query = query.where(and(eq(trades.userId, userId), eq(trades.status, status)));
    }

    return await query
      .orderBy(desc(trades.horarioEntrada))
      .limit(limit)
      .offset(offset);
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [created] = await db
      .insert(trades)
      .values(trade)
      .returning();
    return created;
  }

  async closeTrade(id: string, userId: string, updates: { pontosSaida: number; motivoSaida: string; resultado: string; horarioSaida: Date }): Promise<Trade> {
    const [updated] = await db
      .update(trades)
      .set({
        pontosSaida: updates.pontosSaida,
        motivoSaida: updates.motivoSaida,
        resultado: updates.resultado,
        horarioSaida: updates.horarioSaida,
        status: 'FECHADO'
      })
      .where(and(eq(trades.id, id), eq(trades.userId, userId)))
      .returning();
    return updated;
  }

  async updateTradeStopLoss(id: string, newStopLoss: number): Promise<void> {
    await db
      .update(trades)
      .set({ pontosStopLoss: newStopLoss })
      .where(eq(trades.id, id));
  }

  // API Connection operations
  async getApiConnections(userId: string): Promise<ApiConnection[]> {
    return await db
      .select()
      .from(apiConnections)
      .where(eq(apiConnections.userId, userId))
      .orderBy(desc(apiConnections.createdAt));
  }

  async getApiConnection(id: string, userId: string): Promise<ApiConnection | undefined> {
    const [connection] = await db
      .select()
      .from(apiConnections)
      .where(and(eq(apiConnections.id, id), eq(apiConnections.userId, userId)));
    return connection;
  }

  async createApiConnection(connection: InsertApiConnection): Promise<ApiConnection> {
    const [created] = await db
      .insert(apiConnections)
      .values(connection)
      .returning();
    return created;
  }

  async updateApiConnectionStatus(id: string, updates: { connectionStatus: string; errorMessage?: string | null; lastConnectionTest: Date }): Promise<void> {
    await db
      .update(apiConnections)
      .set({
        connectionStatus: updates.connectionStatus,
        errorMessage: updates.errorMessage,
        lastConnectionTest: updates.lastConnectionTest,
        updatedAt: new Date()
      })
      .where(eq(apiConnections.id, id));
  }

  // Market Data operations
  async getMarketData(symbol: string, timeframe: string, limit: number): Promise<MarketData[]> {
    return await db
      .select()
      .from(marketData)
      .where(and(eq(marketData.symbol, symbol), eq(marketData.timeframe, timeframe)))
      .orderBy(desc(marketData.timestamp))
      .limit(limit);
  }

  async saveMarketData(data: Omit<MarketData, 'id' | 'createdAt'>): Promise<void> {
    await db
      .insert(marketData)
      .values(data)
      .onConflictDoNothing();
  }

  // Technical Indicators operations
  async getLatestTechnicalIndicators(symbol: string, timeframe: string): Promise<TechnicalIndicators | undefined> {
    const [indicators] = await db
      .select()
      .from(technicalIndicators)
      .where(and(eq(technicalIndicators.symbol, symbol), eq(technicalIndicators.timeframe, timeframe)))
      .orderBy(desc(technicalIndicators.timestamp))
      .limit(1);
    return indicators;
  }

  async saveTechnicalIndicators(indicators: Omit<TechnicalIndicators, 'id' | 'createdAt'>): Promise<void> {
    await db
      .insert(technicalIndicators)
      .values(indicators);
  }

  // Bot Logs operations
  async createBotLog(log: Omit<BotLog, 'id' | 'timestamp'>): Promise<void> {
    await db
      .insert(botLogs)
      .values(log);
  }

  // Backtest operations
  async createBacktestResult(result: InsertBacktestResult): Promise<BacktestResult> {
    const [created] = await db
      .insert(backtestResults)
      .values(result)
      .returning();
    return created;
  }

  async getBacktestResults(userId: string): Promise<BacktestResult[]> {
    return await db
      .select()
      .from(backtestResults)
      .where(eq(backtestResults.userId, userId))
      .orderBy(desc(backtestResults.createdAt));
  }

  // Metrics operations
  async getDailyMetrics(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyTrades = await db
      .select({
        totalTrades: sql<number>`count(*)`,
        totalProfit: sql<string>`sum(${trades.resultado})`,
        winningTrades: sql<number>`count(*) filter (where ${trades.resultado} > 0)`,
        losingTrades: sql<number>`count(*) filter (where ${trades.resultado} <= 0)`
      })
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          gte(trades.horarioEntrada, today),
          lte(trades.horarioEntrada, tomorrow)
        )
      );

    const metrics = dailyTrades[0] || {
      totalTrades: 0,
      totalProfit: "0",
      winningTrades: 0,
      losingTrades: 0
    };

    const winRate = metrics.totalTrades > 0 
      ? (metrics.winningTrades / metrics.totalTrades) * 100 
      : 0;

    // Calculate drawdown (simplified)
    const drawdown = parseFloat(metrics.totalProfit || "0") < 0 
      ? parseFloat(metrics.totalProfit || "0") 
      : 0;

    return {
      ...metrics,
      winRate,
      drawdown
    };
  }
}

export const storage = new DatabaseStorage();
