import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { TradingEngine } from "./services/tradingEngine";
import { BrokerService } from "./services/brokerService";
import { MarketDataService } from "./services/marketDataService";
import { insertBotConfigurationSchema, insertTradeSchema, insertApiConnectionSchema, insertBacktestResultSchema } from "@shared/schema";
import { z } from "zod";

interface AuthenticatedRequest extends Express.Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  const tradingEngine = new TradingEngine();
  const brokerService = new BrokerService();
  const marketDataService = new MarketDataService();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Bot Configuration routes
  app.get('/api/bot-configurations', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const configurations = await storage.getBotConfigurations(userId);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching bot configurations:", error);
      res.status(500).json({ message: "Failed to fetch bot configurations" });
    }
  });

  app.post('/api/bot-configurations', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const configData = insertBotConfigurationSchema.parse({ ...req.body, userId });
      const configuration = await storage.createBotConfiguration(configData);
      res.json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      console.error("Error creating bot configuration:", error);
      res.status(500).json({ message: "Failed to create bot configuration" });
    }
  });

  app.put('/api/bot-configurations/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const configId = req.params.id;
      const configData = insertBotConfigurationSchema.parse({ ...req.body, userId });
      const configuration = await storage.updateBotConfiguration(configId, userId, configData);
      res.json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      console.error("Error updating bot configuration:", error);
      res.status(500).json({ message: "Failed to update bot configuration" });
    }
  });

  app.delete('/api/bot-configurations/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const configId = req.params.id;
      await storage.deleteBotConfiguration(configId, userId);
      res.json({ message: "Configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting bot configuration:", error);
      res.status(500).json({ message: "Failed to delete bot configuration" });
    }
  });

  // Trading routes
  app.get('/api/trades', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { limit = 50, offset = 0, status } = req.query;
      const trades = await storage.getTrades(userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        status: status as string
      });
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post('/api/trades', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const tradeData = insertTradeSchema.parse({ ...req.body, userId });
      const trade = await storage.createTrade(tradeData);
      res.json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid trade data", errors: error.errors });
      }
      console.error("Error creating trade:", error);
      res.status(500).json({ message: "Failed to create trade" });
    }
  });

  app.put('/api/trades/:id/close', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const tradeId = req.params.id;
      const { pontosSaida, motivoSaida, resultado } = req.body;
      
      const trade = await storage.closeTrade(tradeId, userId, {
        pontosSaida,
        motivoSaida,
        resultado,
        horarioSaida: new Date()
      });
      res.json(trade);
    } catch (error) {
      console.error("Error closing trade:", error);
      res.status(500).json({ message: "Failed to close trade" });
    }
  });

  // Bot control routes
  app.post('/api/bot/start', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { configId } = req.body;
      
      const config = await storage.getBotConfiguration(configId, userId);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      await tradingEngine.startBot(userId, config);
      res.json({ message: "Bot started successfully" });
    } catch (error) {
      console.error("Error starting bot:", error);
      res.status(500).json({ message: "Failed to start bot" });
    }
  });

  app.post('/api/bot/stop', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      await tradingEngine.stopBot(userId);
      res.json({ message: "Bot stopped successfully" });
    } catch (error) {
      console.error("Error stopping bot:", error);
      res.status(500).json({ message: "Failed to stop bot" });
    }
  });

  app.get('/api/bot/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const status = await tradingEngine.getBotStatus(userId);
      res.json(status);
    } catch (error) {
      console.error("Error getting bot status:", error);
      res.status(500).json({ message: "Failed to get bot status" });
    }
  });

  app.post('/api/bot/emergency-stop', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      await tradingEngine.emergencyStop(userId);
      res.json({ message: "Emergency stop executed" });
    } catch (error) {
      console.error("Error executing emergency stop:", error);
      res.status(500).json({ message: "Failed to execute emergency stop" });
    }
  });

  // Market data routes
  app.get('/api/market-data/:symbol', isAuthenticated, async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '5m', limit = 100 } = req.query;
      
      const data = await marketDataService.getMarketData(
        symbol,
        timeframe as string,
        parseInt(limit as string)
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching market data:", error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  app.get('/api/technical-indicators/:symbol', isAuthenticated, async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '5m' } = req.query;
      
      const indicators = await marketDataService.getTechnicalIndicators(
        symbol,
        timeframe as string
      );
      res.json(indicators);
    } catch (error) {
      console.error("Error fetching technical indicators:", error);
      res.status(500).json({ message: "Failed to fetch technical indicators" });
    }
  });

  // API Connections routes
  app.get('/api/connections', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const connections = await storage.getApiConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching API connections:", error);
      res.status(500).json({ message: "Failed to fetch API connections" });
    }
  });

  app.post('/api/connections', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const connectionData = insertApiConnectionSchema.parse({ ...req.body, userId });
      const connection = await storage.createApiConnection(connectionData);
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid connection data", errors: error.errors });
      }
      console.error("Error creating API connection:", error);
      res.status(500).json({ message: "Failed to create API connection" });
    }
  });

  app.post('/api/connections/:id/test', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const connectionId = req.params.id;
      
      const connection = await storage.getApiConnection(connectionId, userId);
      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      const testResult = await brokerService.testConnection(connection);
      
      await storage.updateApiConnectionStatus(connectionId, {
        connectionStatus: testResult.success ? "CONNECTED" : "ERROR",
        errorMessage: testResult.error || null,
        lastConnectionTest: new Date()
      });

      res.json(testResult);
    } catch (error) {
      console.error("Error testing API connection:", error);
      res.status(500).json({ message: "Failed to test API connection" });
    }
  });

  // Backtest routes
  app.post('/api/backtest', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { configId, period, interval, name } = req.body;
      
      const config = await storage.getBotConfiguration(configId, userId);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      const backtestResult = await tradingEngine.runBacktest(config, period, interval);
      
      const resultData = insertBacktestResultSchema.parse({
        userId,
        botConfigId: configId,
        name,
        period,
        interval,
        totalTrades: backtestResult.totalTrades,
        winningTrades: backtestResult.winningTrades,
        losingTrades: backtestResult.losingTrades,
        totalReturn: backtestResult.totalReturn,
        averageReturn: backtestResult.averageReturn,
        maxDrawdown: backtestResult.maxDrawdown,
        winRate: backtestResult.winRate,
        results: backtestResult.trades
      });

      const savedResult = await storage.createBacktestResult(resultData);
      res.json(savedResult);
    } catch (error) {
      console.error("Error running backtest:", error);
      res.status(500).json({ message: "Failed to run backtest" });
    }
  });

  app.get('/api/backtest-results', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const results = await storage.getBacktestResults(userId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching backtest results:", error);
      res.status(500).json({ message: "Failed to fetch backtest results" });
    }
  });

  // Metrics routes
  app.get('/api/metrics/daily', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const metrics = await storage.getDailyMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching daily metrics:", error);
      res.status(500).json({ message: "Failed to fetch daily metrics" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: (info) => {
      // Add authentication verification here if needed
      return true;
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected');
    
    // Send initial connection message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to TradingBot Pro'
      }));
    }

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'subscribe':
            // Handle subscription to specific data feeds
            console.log('Client subscribed to:', message.channel);
            break;
          case 'unsubscribe':
            console.log('Client unsubscribed from:', message.channel);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Broadcast real-time data to connected clients
  const broadcastToClients = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Set up market data streaming
  marketDataService.on('marketData', (data) => {
    broadcastToClients({
      type: 'marketData',
      data
    });
  });

  // Set up trading engine events
  tradingEngine.on('tradeUpdate', (data) => {
    broadcastToClients({
      type: 'tradeUpdate',
      data
    });
  });

  tradingEngine.on('botStatusChange', (data) => {
    broadcastToClients({
      type: 'botStatus',
      data
    });
  });

  return httpServer;
}
