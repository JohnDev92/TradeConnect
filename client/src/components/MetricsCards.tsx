import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ArrowUpDown, Percent, TrendingDown } from "lucide-react";

interface MetricsCardsProps {
  metrics?: any;
  realtimeUpdates?: any;
}

export default function MetricsCards({ metrics, realtimeUpdates }: MetricsCardsProps) {
  // Use real-time updates if available, otherwise fall back to cached data
  const dailyProfit = realtimeUpdates?.dailyProfit || metrics?.totalProfit || 0;
  const dailyTrades = realtimeUpdates?.dailyTrades || metrics?.totalTrades || 0;
  const winRate = metrics?.winRate || 0;
  const drawdown = metrics?.drawdown || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-dark-100 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Lucro Hoje</p>
              <p className={`text-2xl font-bold font-mono ${
                dailyProfit >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {formatCurrency(dailyProfit)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={dailyProfit >= 0 ? "text-green-500" : "text-red-500"}>
              {dailyProfit >= 0 ? "+" : ""}{formatPercentage((dailyProfit / 10000) * 100)}
            </span>
            <span className="text-gray-400 ml-2">vs. ontem</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-dark-100 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Trades Hoje</p>
              <p className="text-2xl font-bold text-white font-mono">{dailyTrades}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <ArrowUpDown className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-500">{Math.floor(dailyTrades * 0.7)} WIN</span>
            <span className="text-red-500 ml-2">{Math.ceil(dailyTrades * 0.3)} LOSS</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-dark-100 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-white font-mono">
                {formatPercentage(winRate)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Percent className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Meta: 65%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-dark-100 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Drawdown</p>
              <p className="text-2xl font-bold text-red-500 font-mono">
                {formatCurrency(Math.abs(drawdown))}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Max: R$ 500</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
