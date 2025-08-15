import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bot configurations
export const botConfigurations = pgTable("bot_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  isActive: boolean("is_active").default(false),
  contratos: integer("contratos").default(1),
  metaLucroDiario: decimal("meta_lucro_diario", { precision: 10, scale: 2 }).default("500.00"),
  stopLossPontos: integer("stop_loss_pontos").default(150),
  maxTradesDia: integer("max_trades_dia").default(3),
  contratoPreferido: varchar("contrato_preferido").default("WIN"), // WIN or WDO
  usarHorarioDinamico: boolean("usar_horario_dinamico").default(true),
  trailingStopAtivo: boolean("trailing_stop_ativo").default(true),
  trailingStopPontos: integer("trailing_stop_pontos").default(50),
  horariosEntrada: jsonb("horarios_entrada").default(['10:00', '13:00', '15:30']),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trading positions and history
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  botConfigId: varchar("bot_config_id").references(() => botConfigurations.id),
  contrato: varchar("contrato").notNull(), // WIN or WDO
  tipo: varchar("tipo").notNull(), // COMPRA or VENDA
  pontosEntrada: real("pontos_entrada").notNull(),
  pontosSaida: real("pontos_saida"),
  pontosTakeProfit: real("pontos_take_profit").notNull(),
  pontosStopLoss: real("pontos_stop_loss").notNull(),
  contratos: integer("contratos").notNull(),
  valorPorPonto: real("valor_por_ponto").notNull(),
  resultado: decimal("resultado", { precision: 10, scale: 2 }).default("0.00"),
  motivoSaida: varchar("motivo_saida"), // TAKE_PROFIT, STOP_LOSS, MANUAL, etc.
  status: varchar("status").default("ATIVO"), // ATIVO, FECHADO, CANCELADO
  horarioEntrada: timestamp("horario_entrada").defaultNow(),
  horarioSaida: timestamp("horario_saida"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API connections and credentials
export const apiConnections = pgTable("api_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  provider: varchar("provider").notNull(), // CLEAR, XP, RICO, etc.
  name: varchar("name").notNull(),
  isActive: boolean("is_active").default(false),
  credentials: jsonb("credentials"), // Encrypted API keys and tokens
  lastConnectionTest: timestamp("last_connection_test"),
  connectionStatus: varchar("connection_status").default("DISCONNECTED"), // CONNECTED, DISCONNECTED, ERROR
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Market data cache
export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol").notNull(), // WIN, WDO, ^BVSP, USDBRL=X
  timeframe: varchar("timeframe").notNull(), // 1m, 5m, 15m, etc.
  timestamp: timestamp("timestamp").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Technical indicators cache
export const technicalIndicators = pgTable("technical_indicators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol").notNull(),
  timeframe: varchar("timeframe").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  rsi: real("rsi"),
  ema9: real("ema9"),
  ema21: real("ema21"),
  macd: real("macd"),
  macdSignal: real("macd_signal"),
  volatilidade: real("volatilidade"),
  volumeRatio: real("volume_ratio"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bot execution logs
export const botLogs = pgTable("bot_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  botConfigId: varchar("bot_config_id").references(() => botConfigurations.id),
  level: varchar("level").notNull(), // INFO, WARNING, ERROR
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Backtest results
export const backtestResults = pgTable("backtest_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  botConfigId: varchar("bot_config_id").references(() => botConfigurations.id),
  name: varchar("name").notNull(),
  period: varchar("period").notNull(), // 1mo, 3mo, 6mo, 1y
  interval: varchar("interval").notNull(), // 1m, 5m, 15m, etc.
  totalTrades: integer("total_trades").notNull(),
  winningTrades: integer("winning_trades").notNull(),
  losingTrades: integer("losing_trades").notNull(),
  totalReturn: decimal("total_return", { precision: 10, scale: 2 }).notNull(),
  averageReturn: decimal("average_return", { precision: 10, scale: 2 }).notNull(),
  maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 2 }),
  winRate: real("win_rate").notNull(),
  results: jsonb("results"), // Detailed trade-by-trade results
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertBotConfigurationSchema = createInsertSchema(botConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertApiConnectionSchema = createInsertSchema(apiConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBacktestResultSchema = createInsertSchema(backtestResults).omit({
  id: true,
  createdAt: true,
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type BotConfiguration = typeof botConfigurations.$inferSelect;
export type InsertBotConfiguration = z.infer<typeof insertBotConfigurationSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type ApiConnection = typeof apiConnections.$inferSelect;
export type InsertApiConnection = z.infer<typeof insertApiConnectionSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type TechnicalIndicators = typeof technicalIndicators.$inferSelect;
export type BotLog = typeof botLogs.$inferSelect;
export type BacktestResult = typeof backtestResults.$inferSelect;
export type InsertBacktestResult = z.infer<typeof insertBacktestResultSchema>;
