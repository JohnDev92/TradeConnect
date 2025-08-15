import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MetricsCards from "@/components/MetricsCards";
import LiveChart from "@/components/LiveChart";
import TradingControls from "@/components/TradingControls";
import TradesTable from "@/components/TradesTable";
import { useWebSocket } from "@/hooks/useWebSocket";

interface DashboardData {
  botStatus: any;
  dailyMetrics: any;
  currentPosition: any;
  marketData: any;
  technicalIndicators: any;
}

export default function Dashboard() {
  const [realtimeData, setRealtimeData] = useState<any>({});

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/metrics/daily"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: botStatus } = useQuery({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000, // Check bot status every 5 seconds
  });

  const { data: marketData } = useQuery({
    queryKey: ["/api/market-data/WIN"],
    refetchInterval: 5000,
  });

  const { data: technicalIndicators } = useQuery({
    queryKey: ["/api/technical-indicators/WIN"],
    refetchInterval: 10000,
  });

  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'marketData':
          setRealtimeData((prev: any) => ({
            ...prev,
            marketData: message.data
          }));
          break;
        case 'tradeUpdate':
          setRealtimeData((prev: any) => ({
            ...prev,
            tradeUpdate: message.data
          }));
          break;
        case 'botStatus':
          setRealtimeData((prev: any) => ({
            ...prev,
            botStatus: message.data
          }));
          break;
      }
    },
    onConnect: () => {
      console.log('Connected to real-time feed');
    },
    onDisconnect: () => {
      console.log('Disconnected from real-time feed');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-200 flex items-center justify-center">
        <div className="text-white text-xl">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-6">
        <Header 
          botStatus={realtimeData.botStatus || botStatus} 
          isConnected={isConnected}
        />
        
        <MetricsCards 
          metrics={dashboardData} 
          realtimeUpdates={realtimeData}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <LiveChart 
              marketData={realtimeData.marketData || marketData}
              technicalIndicators={technicalIndicators}
            />
          </div>
          
          <div>
            <TradingControls 
              botStatus={realtimeData.botStatus || botStatus}
              currentPosition={realtimeData.tradeUpdate?.trade}
            />
          </div>
        </div>
        
        <TradesTable />
      </main>
    </div>
  );
}
