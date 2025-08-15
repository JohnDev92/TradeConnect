# Overview

TradingBot Pro is a sophisticated automated day trading system designed for Brazilian financial markets, specifically focusing on WIN (Mini Índice Bovespa) and WDO (Mini Dólar) futures contracts. The application combines real-time market data analysis, technical indicators, and algorithmic trading strategies to execute automated trades through broker APIs. It features a comprehensive web interface for configuration management, real-time monitoring, backtesting capabilities, and detailed trade analytics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack TypeScript Architecture
The application follows a monorepo structure with shared type definitions and schemas. The frontend is built with React and TypeScript, while the backend uses Express.js with TypeScript, ensuring type safety across the entire application stack.

## Frontend Architecture (React/Vite)
- **Framework**: React with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live market data

## Backend Architecture (Express.js)
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server for live data streaming
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with proper error handling and validation

## Database Design (PostgreSQL with Drizzle ORM)
- **Sessions Table**: Stores user session data for authentication
- **Users Table**: User profiles and authentication information
- **Bot Configurations**: Trading bot settings and parameters
- **Trades**: Complete trade lifecycle tracking with entry/exit points
- **API Connections**: Broker API credentials and connection status
- **Market Data**: Historical and real-time price data storage
- **Technical Indicators**: Calculated trading indicators (EMA, RSI, MACD)
- **Bot Logs**: System activity and decision logging
- **Backtest Results**: Historical strategy performance data

## Trading Engine Architecture
- **Event-Driven Design**: Uses EventEmitter pattern for real-time updates
- **Service Layer**: Separated concerns with MarketDataService, BrokerService, and TradingEngine
- **Strategy Implementation**: Technical analysis using EMA crossovers, RSI, and MACD
- **Risk Management**: Built-in stop-loss, trailing stops, and position sizing
- **Real-time Processing**: Continuous market data analysis and trade execution

## Authentication System (Replit Auth)
- **OAuth Integration**: Replit OAuth for seamless authentication
- **Session Management**: PostgreSQL-backed sessions with proper expiration
- **User Management**: Automatic user creation and profile management
- **Security**: HTTPS enforcement and secure cookie handling

## Market Data Integration
- **Yahoo Finance API**: Primary source for historical and real-time data
- **WebSocket Streams**: Real-time price updates and technical indicators
- **Data Caching**: Intelligent caching with TanStack Query for performance
- **Technical Analysis**: Real-time calculation of trading indicators

## File Structure Organization
- `/client`: React frontend application
- `/server`: Express.js backend with API routes and services
- `/shared`: Common TypeScript types and database schemas
- `/__tests__`: Comprehensive test suite for trading logic
- `/attached_assets`: Python trading bot reference implementation

## Real-time Communication
- **WebSocket Server**: Bidirectional communication for live updates
- **Event Broadcasting**: Market data and trade status updates
- **Connection Management**: Automatic reconnection and error handling
- **Performance Optimization**: Efficient message serialization and throttling

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations with migration support

## Market Data Providers
- **Yahoo Finance API**: Primary source for market data and historical prices
- **WebSocket API**: Real-time price feeds and market updates

## Authentication Services
- **Replit Auth**: OAuth-based authentication system
- **Session Storage**: PostgreSQL-backed session management

## UI and Styling Libraries
- **Radix UI**: Unstyled, accessible React components
- **shadcn/ui**: Pre-styled component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography

## Development and Build Tools
- **Vite**: Fast build tool with HMR for development
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

## Broker Integration (Planned)
- **Clear Corretora API**: Brazilian broker integration for trade execution
- **XP Investimentos API**: Alternative broker support
- **Rico Investimentos**: Additional broker connectivity options

## Testing and Quality Assurance
- **Jest**: Testing framework for unit and integration tests
- **Testing Library**: React component testing utilities
- **TypeScript**: Compile-time error detection and type safety