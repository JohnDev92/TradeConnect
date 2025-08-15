import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";

interface LiveChartProps {
  marketData?: any;
  technicalIndicators?: any;
}

export default function LiveChart({ marketData, technicalIndicators }: LiveChartProps) {
  const [timeframe, setTimeframe] = useState("5m");
  const [currentPrice, setCurrentPrice] = useState(112450);

  useEffect(() => {
    if (marketData?.price) {
      setCurrentPrice(marketData.price);
    }
  }, [marketData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatIndicator = (value: number | undefined, decimals = 1) => {
    if (value === undefined || value === null) return "--";
    return value.toFixed(decimals);
  };

  const getTrendDirection = (ema9?: number, ema21?: number) => {
    if (!ema9 || !ema21) return "NEUTRO";
    return ema9 > ema21 ? "↗ ALTA" : "↘ BAIXA";
  };

  const getTrendColor = (ema9?: number, ema21?: number) => {
    if (!ema9 || !ema21) return "text-gray-400";
    return ema9 > ema21 ? "text-green-500" : "text-red-500";
  };

  return (
    <Card className="bg-dark-100 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">
            WIN - Mini Índice Bovespa
          </CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="bg-dark-300 border-gray-600 text-white w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-dark-300 border-gray-600">
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-white font-mono border-gray-600">
              {formatPrice(currentPrice)} pts
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Chart Placeholder */}
        <div className="h-80 bg-dark-300 rounded-lg flex items-center justify-center mb-6">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">Gráfico em Tempo Real</p>
            <p className="text-sm text-gray-500 mt-2">
              Integração com dados de mercado em desenvolvimento
            </p>
            <div className="mt-4 px-4 py-2 bg-blue-500/10 rounded-lg inline-block">
              <p className="text-blue-400 text-sm">
                Preço atual: <span className="font-mono font-bold">{formatPrice(currentPrice)} pts</span>
              </p>
              {marketData?.changePercent && (
                <p className={`text-sm font-mono ${
                  marketData.changePercent >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {marketData.changePercent >= 0 ? "+" : ""}{marketData.changePercent.toFixed(2)}%
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Technical Indicators */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">RSI (9)</p>
            <p className="text-lg font-mono text-white">
              {formatIndicator(technicalIndicators?.rsi)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">EMA 9/21</p>
            <p className={`text-lg font-mono ${getTrendColor(technicalIndicators?.ema9, technicalIndicators?.ema21)}`}>
              {getTrendDirection(technicalIndicators?.ema9, technicalIndicators?.ema21)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">MACD</p>
            <p className={`text-lg font-mono ${
              (technicalIndicators?.macd || 0) > 0 ? "text-blue-500" : "text-red-500"
            }`}>
              {(technicalIndicators?.macd || 0) >= 0 ? "+" : ""}{formatIndicator(technicalIndicators?.macd, 2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
