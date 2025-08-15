import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import TradingControls from "@/components/TradingControls";
import LiveChart from "@/components/LiveChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Play, Pause, Square, AlertTriangle } from "lucide-react";

export default function Trading() {
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configurations = [] } = useQuery({
    queryKey: ["/api/bot-configurations"],
  });

  const { data: botStatus } = useQuery({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000,
  });

  const { data: marketData } = useQuery({
    queryKey: ["/api/market-data/WIN"],
    refetchInterval: 5000,
  });

  const { data: technicalIndicators } = useQuery({
    queryKey: ["/api/technical-indicators/WIN"],
    refetchInterval: 10000,
  });

  const { data: dailyMetrics } = useQuery({
    queryKey: ["/api/metrics/daily"],
    refetchInterval: 30000,
  });

  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'tradeUpdate') {
        queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/metrics/daily"] });
        toast({
          title: "Trade Atualizado",
          description: `${message.data.trade.tipo} executado`,
        });
      }
    },
  });

  const startBotMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConfigId) {
        throw new Error("Selecione uma configuração");
      }
      await apiRequest("POST", "/api/bot/start", { configId: selectedConfigId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      toast({
        title: "Bot Iniciado",
        description: "Trading bot iniciado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar o bot",
        variant: "destructive",
      });
    },
  });

  const stopBotMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/bot/stop");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      toast({
        title: "Bot Parado",
        description: "Trading bot parado com segurança",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao parar o bot",
        variant: "destructive",
      });
    },
  });

  const pauseBotMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/bot/pause");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      toast({
        title: "Bot Pausado",
        description: "Trading bot pausado temporariamente",
      });
    },
  });

  const activeConfig = configurations.find((c: any) => c.id === selectedConfigId);

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-6">
        <Header botStatus={botStatus} isConnected={isConnected} />
        
        {/* Bot Control Panel */}
        <Card className="bg-dark-100 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Controle do Bot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Configuração Ativa
                </label>
                <select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  className="w-full bg-dark-300 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  disabled={botStatus?.isActive}
                >
                  <option value="">Selecione uma configuração</option>
                  {configurations.map((config: any) => (
                    <option key={config.id} value={config.id}>
                      {config.name} - {config.contratoPreferido}
                    </option>
                  ))}
                </select>
                {activeConfig && (
                  <div className="mt-2 text-sm text-gray-400">
                    <p>Contratos: {activeConfig.contratos}</p>
                    <p>Meta: R$ {activeConfig.metaLucroDiario}</p>
                    <p>Stop: {activeConfig.stopLossPontos} pts</p>
                  </div>
                )}
              </div>

              {/* Bot Controls */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Controles
                </label>
                <div className="flex space-x-2">
                  {!botStatus?.isActive ? (
                    <Button
                      onClick={() => startBotMutation.mutate()}
                      disabled={startBotMutation.isPending || !selectedConfigId}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => pauseBotMutation.mutate()}
                        disabled={pauseBotMutation.isPending}
                        variant="outline"
                        className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                      </Button>
                      <Button
                        onClick={() => stopBotMutation.mutate()}
                        disabled={stopBotMutation.isPending}
                        variant="destructive"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Parar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <div className="space-y-2">
                  <Badge 
                    variant={botStatus?.isActive ? "default" : "secondary"}
                    className="block w-fit"
                  >
                    {botStatus?.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge 
                    variant={isConnected ? "default" : "destructive"}
                    className="block w-fit"
                  >
                    {isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Daily Progress */}
          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Progresso Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Lucro</span>
                    <span className="text-white">
                      R$ {parseFloat(dailyMetrics?.totalProfit || "0").toFixed(2)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.max(0, Math.min(100, (parseFloat(dailyMetrics?.totalProfit || "0") / 500) * 100))}
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Trades</span>
                    <span className="text-white">
                      {dailyMetrics?.totalTrades || 0} / {activeConfig?.maxTradesDia || 3}
                    </span>
                  </div>
                  <Progress 
                    value={((dailyMetrics?.totalTrades || 0) / (activeConfig?.maxTradesDia || 3)) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Monitor */}
          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Monitor de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Win Rate</span>
                  <span className="text-white font-mono">
                    {(dailyMetrics?.winRate || 0).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Drawdown</span>
                  <span className="text-red-500 font-mono">
                    R$ {Math.abs(dailyMetrics?.drawdown || 0).toFixed(2)}
                  </span>
                </div>

                {(dailyMetrics?.drawdown || 0) < -400 && (
                  <div className="flex items-center space-x-2 p-2 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-red-400 text-sm">Alto risco!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Market Info */}
          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Mercado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">WIN</span>
                  <span className="text-white font-mono">
                    {marketData?.close ? marketData.close.toFixed(0) : "--"} pts
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">RSI</span>
                  <span className="text-white font-mono">
                    {technicalIndicators?.rsi ? technicalIndicators.rsi.toFixed(1) : "--"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Tendência</span>
                  <span className={`font-mono text-sm ${
                    technicalIndicators?.ema9 && technicalIndicators?.ema21
                      ? technicalIndicators.ema9 > technicalIndicators.ema21
                        ? "text-green-500" 
                        : "text-red-500"
                      : "text-gray-400"
                  }`}>
                    {technicalIndicators?.ema9 && technicalIndicators?.ema21
                      ? technicalIndicators.ema9 > technicalIndicators.ema21 
                        ? "↗ ALTA" 
                        : "↘ BAIXA"
                      : "NEUTRO"
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveChart 
              marketData={marketData}
              technicalIndicators={technicalIndicators}
            />
          </div>
          
          <div>
            <TradingControls 
              botStatus={botStatus}
              currentPosition={botStatus?.currentPosition}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
