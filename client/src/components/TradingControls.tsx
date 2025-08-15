import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowUp, 
  ArrowDown, 
  Pause, 
  X, 
  AlertTriangle,
  DollarSign,
  Target,
  StopCircle
} from "lucide-react";

interface TradingControlsProps {
  botStatus?: any;
  currentPosition?: any;
}

export default function TradingControls({ botStatus, currentPosition }: TradingControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const closePositionMutation = useMutation({
    mutationFn: async () => {
      if (!currentPosition) return;
      await apiRequest("PUT", `/api/trades/${currentPosition.id}/close`, {
        pontosSaida: currentPosition.pontosEntrada, // Close at current market price
        motivoSaida: "MANUAL",
        resultado: "0"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      toast({
        title: "Posição Fechada",
        description: "Posição fechada manualmente",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao fechar posição",
        variant: "destructive",
      });
    },
  });

  const forceTradeMutation = useMutation({
    mutationFn: async (direction: string) => {
      await apiRequest("POST", "/api/bot/force-trade", { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      toast({
        title: "Trade Forçado",
        description: "Ordem executada manualmente",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao executar trade",
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
        description: "Bot pausado temporariamente",
      });
    },
  });

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatPoints = (value: number) => {
    return value.toFixed(1);
  };

  const calculatePnL = () => {
    if (!currentPosition) return 0;
    
    // This would use real market price in production
    const currentPrice = currentPosition.pontosEntrada; // Placeholder
    const contractValue = currentPosition.valorPorPonto * currentPosition.contratos;
    
    if (currentPosition.tipo === 'COMPRA') {
      return (currentPrice - currentPosition.pontosEntrada) * contractValue;
    } else {
      return (currentPosition.pontosEntrada - currentPrice) * contractValue;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Position */}
      <Card className="bg-dark-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Posição Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {currentPosition ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                <Badge variant={currentPosition.tipo === 'COMPRA' ? 'default' : 'secondary'}>
                  {currentPosition.tipo}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Entrada:</span>
                  <span className="font-mono text-white">
                    {formatPoints(currentPosition.pontosEntrada)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Atual:</span>
                  <span className="font-mono text-white">
                    {formatPoints(currentPosition.pontosEntrada)} {/* Would be live price */}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">P&L:</span>
                  <span className={`font-mono ${
                    calculatePnL() >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {formatCurrency(calculatePnL())}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Take Profit:</span>
                  <span className="font-mono text-green-500">
                    {formatPoints(currentPosition.pontosTakeProfit)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Stop Loss:</span>
                  <span className="font-mono text-red-500">
                    {formatPoints(currentPosition.pontosStopLoss)}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={() => closePositionMutation.mutate()}
                disabled={closePositionMutation.isPending}
                variant="destructive"
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Fechar Posição
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-400">Nenhuma posição aberta</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-dark-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              onClick={() => forceTradeMutation.mutate('COMPRA')}
              disabled={forceTradeMutation.isPending || !!currentPosition || !botStatus?.isActive}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Força Compra
            </Button>
            
            <Button 
              onClick={() => forceTradeMutation.mutate('VENDA')}
              disabled={forceTradeMutation.isPending || !!currentPosition || !botStatus?.isActive}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              Força Venda
            </Button>
            
            <Button 
              onClick={() => pauseBotMutation.mutate()}
              disabled={pauseBotMutation.isPending || !botStatus?.isActive}
              variant="outline"
              className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pausar Bot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Monitor */}
      <Card className="bg-dark-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Monitor de Risco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Exposição Diária</span>
                <span className="text-white">R$ 2.500 / R$ 5.000</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Drawdown</span>
                <span className="text-white">R$ 245 / R$ 500</span>
              </div>
              <Progress value={49} className="h-2 bg-red-500/20" />
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500 text-sm">Atenção</span>
              </div>
              <span className="text-yellow-500 text-sm">Risco Moderado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="bg-dark-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Win Rate Hoje:</span>
              <span className="text-white font-mono">71.4%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Média por Trade:</span>
              <span className="text-green-500 font-mono">+R$ 178,21</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Maior Ganho:</span>
              <span className="text-green-500 font-mono">+R$ 450,00</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Maior Perda:</span>
              <span className="text-red-500 font-mono">-R$ 150,00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
