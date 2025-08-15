import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BrokerService } from '../server/services/brokerService';
import { ApiConnection } from '@shared/schema';

describe('BrokerService', () => {
  let brokerService: BrokerService;

  beforeEach(() => {
    brokerService = new BrokerService();
    jest.clearAllMocks();
  });

  describe('Trade Execution', () => {
    it('should execute a buy order successfully', async () => {
      const tradeOrder = {
        symbol: 'WIN',
        side: 'COMPRA' as const,
        quantity: 1,
        price: 112450,
      };

      const result = await brokerService.executeTrade(tradeOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.orderId).toMatch(/^ORD_\d+_[a-z0-9]+$/);
      expect(result.error).toBeUndefined();
    });

    it('should execute a sell order successfully', async () => {
      const tradeOrder = {
        symbol: 'WDO',
        side: 'VENDA' as const,
        quantity: 2,
        price: 5.25,
      };

      const result = await brokerService.executeTrade(tradeOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle trade execution errors', async () => {
      // Mock console.log to suppress output during tests
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Mock an error by overriding the method temporarily
      const originalExecuteTrade = brokerService.executeTrade;
      brokerService.executeTrade = jest.fn().mockRejectedValue(new Error('Network error'));

      const tradeOrder = {
        symbol: 'WIN',
        side: 'COMPRA' as const,
        quantity: 1,
        price: 112450,
      };

      const result = await brokerService.executeTrade(tradeOrder);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.orderId).toBeUndefined();

      // Restore original methods
      brokerService.executeTrade = originalExecuteTrade;
      console.log = originalConsoleLog;
    });
  });

  describe('Connection Testing', () => {
    describe('Clear Corretora', () => {
      it('should test Clear connection successfully', async () => {
        const connection: ApiConnection = {
          id: 'test-connection',
          userId: 'test-user',
          provider: 'CLEAR',
          name: 'Test Clear Connection',
          isActive: true,
          credentials: {
            apiKey: 'test-api-key',
            apiSecret: 'test-api-secret',
          },
          lastConnectionTest: null,
          connectionStatus: 'DISCONNECTED',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await brokerService.testConnection(connection);

        expect(result.success).toBeDefined();
        expect(result.latency).toBeGreaterThan(0);
        
        if (result.success) {
          expect(result.error).toBeUndefined();
        } else {
          expect(result.error).toBeDefined();
        }
      });

      it('should fail Clear connection with missing credentials', async () => {
        const connection: ApiConnection = {
          id: 'test-connection',
          userId: 'test-user',
          provider: 'CLEAR',
          name: 'Test Clear Connection',
          isActive: true,
          credentials: {}, // Missing credentials
          lastConnectionTest: null,
          connectionStatus: 'DISCONNECTED',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await brokerService.testConnection(connection);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing API credentials');
      });
    });

    describe('XP Investimentos', () => {
      it('should test XP connection with valid credentials', async () => {
        const connection: ApiConnection = {
          id: 'test-connection',
          userId: 'test-user',
          provider: 'XP',
          name: 'Test XP Connection',
          isActive: true,
          credentials: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
          lastConnectionTest: null,
          connectionStatus: 'DISCONNECTED',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await brokerService.testConnection(connection);

        expect(result.success).toBeDefined();
        expect(result.latency).toBeGreaterThan(0);
      });

      it('should fail XP connection with missing credentials', async () => {
        const connection: ApiConnection = {
          id: 'test-connection',
          userId: 'test-user',
          provider: 'XP',
          name: 'Test XP Connection',
          isActive: true,
          credentials: {
            clientId: 'test-client-id',
            // Missing clientSecret
          },
          lastConnectionTest: null,
          connectionStatus: 'DISCONNECTED',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await brokerService.testConnection(connection);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing XP credentials');
      });
    });

    describe('Rico Investimentos', () => {
      it('should test Rico connection with valid credentials', async () => {
        const connection: ApiConnection = {
          id: 'test-connection',
          userId: 'test-user',
          provider: 'RICO',
          name: 'Test Rico Connection',
          isActive: true,
          credentials: {
            username: 'test-username',
            password: 'test-password',
          },
          lastConnectionTest: null,
          connectionStatus: 'DISCONNECTED',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await brokerService.testConnection(connection);

        expect(result.success).toBeDefined();
        expect(result.latency).toBeGreaterThan(0);
      });

      it('should fail Rico connection with missing credentials', async () => {
        const connection: ApiConnection = {
          id: 'test-connection',
          userId: 'test-user',
          provider: 'RICO',
          name: 'Test Rico Connection',
          isActive: true,
          credentials: {
            username: 'test-username',
            // Missing password
          },
          lastConnectionTest: null,
          connectionStatus: 'DISCONNECTED',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await brokerService.testConnection(connection);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Missing Rico credentials');
      });
    });

    it('should handle unsupported broker providers', async () => {
      const connection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'UNSUPPORTED',
        name: 'Test Unsupported Connection',
        isActive: true,
        credentials: {},
        lastConnectionTest: null,
        connectionStatus: 'DISCONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await brokerService.testConnection(connection);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported broker: UNSUPPORTED');
    });
  });

  describe('Account Operations', () => {
    it('should get account balance', async () => {
      const mockConnection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'CLEAR',
        name: 'Test Connection',
        isActive: true,
        credentials: {},
        lastConnectionTest: null,
        connectionStatus: 'CONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const balance = await brokerService.getAccountBalance(mockConnection);

      expect(balance).toBeDefined();
      expect(balance.available).toBeDefined();
      expect(balance.used).toBeDefined();
      expect(balance.currency).toBe('BRL');
      expect(typeof balance.available).toBe('number');
      expect(typeof balance.used).toBe('number');
    });

    it('should get open positions', async () => {
      const mockConnection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'CLEAR',
        name: 'Test Connection',
        isActive: true,
        credentials: {},
        lastConnectionTest: null,
        connectionStatus: 'CONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const positions = await brokerService.getOpenPositions(mockConnection);

      expect(Array.isArray(positions)).toBe(true);
    });
  });

  describe('Order Management', () => {
    it('should cancel an order successfully', async () => {
      const mockConnection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'CLEAR',
        name: 'Test Connection',
        isActive: true,
        credentials: {},
        lastConnectionTest: null,
        connectionStatus: 'CONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orderId = 'test-order-123';
      const result = await brokerService.cancelOrder(mockConnection, orderId);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.error).toBeUndefined();
    });

    it('should handle order cancellation errors', async () => {
      // Mock console.log to suppress output during tests
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Mock an error by overriding the method temporarily
      const originalCancelOrder = brokerService.cancelOrder;
      brokerService.cancelOrder = jest.fn().mockRejectedValue(new Error('Order not found'));

      const mockConnection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'CLEAR',
        name: 'Test Connection',
        isActive: true,
        credentials: {},
        lastConnectionTest: null,
        connectionStatus: 'CONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await brokerService.cancelOrder(mockConnection, 'invalid-order');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');

      // Restore original methods
      brokerService.cancelOrder = originalCancelOrder;
      console.log = originalConsoleLog;
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts in connection tests', async () => {
      const connection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'CLEAR',
        name: 'Test Connection',
        isActive: true,
        credentials: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
        lastConnectionTest: null,
        connectionStatus: 'DISCONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock a timeout by overriding the test method
      const originalTestClearConnection = (brokerService as any).testClearConnection;
      (brokerService as any).testClearConnection = jest.fn().mockRejectedValue(new Error('Request timeout'));

      const result = await brokerService.testConnection(connection);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(result.latency).toBeGreaterThan(0);

      // Restore original method
      (brokerService as any).testClearConnection = originalTestClearConnection;
    });

    it('should provide meaningful error messages', async () => {
      const connection: ApiConnection = {
        id: 'test-connection',
        userId: 'test-user',
        provider: 'CLEAR',
        name: 'Test Connection',
        isActive: true,
        credentials: {
          apiKey: 'invalid-key',
          apiSecret: 'invalid-secret',
        },
        lastConnectionTest: null,
        connectionStatus: 'DISCONNECTED',
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await brokerService.testConnection(connection);

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).not.toBe('Unknown error');
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
      }
    });
  });
});
