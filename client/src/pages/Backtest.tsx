import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface BacktestForm {
  configId: string;
  name: string;
  period: string;
  interval: string;
}

export default function Backtest() {
  const [form, setForm] = useState<BacktestForm>({
    configId: "",
    name: "",
    period: "1mo",
    interval: "5m"
  });
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const { data: configurations = [] } = useQuery({
    queryKey: ["/api/bot-configurations"],
  });

  const { data: backtestResults = [] } = useQuery({
    queryKey: ["/api/backtest-results"],
  });

  const runBacktestMutation = useMutation({
    mutationFn: async (data: BacktestForm) => {
      setIsRunning(true);
      return await apiRequest("POST", "/api/backtest", data);
    },
    onSuccess: (result) => {
      setIsRunning(false);
      toast({
        title: "Backtest Concluído",
        description: `${result.totalTrades} trades executados`,
      });
      setForm(prev => ({ ...prev, name: "" }));
    },
    onError: () => {
      setIsRunning(false);
      toast({
        title: "Erro",
        description: "Falha ao executar backtest",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.configId || !form.name) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    runBacktestMutation.mutate(form);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPeriodLabel = (period: string) => {
    const labels: { [key: string]: string } = {
      '1d': '1 Dia',
      '1w': '1 Semana',
      '1mo': '1 Mês',
      '3mo': '3 Meses',
      '6mo': '6 Meses',
      '1y': '1 Ano'
    };
    return labels[period] || period;
  };

  const getIntervalLabel = (interval: string) => {
    const labels: { [key: string]: string } = {
      '1m': '1 Minuto',
      '5m': '5 Minutos',
      '15m': '15 Minutos',
      '30m': '30 Minutos',
      '1h': '1 Hora'
    };
    return labels[interval] || interval;
  };

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-6">
        <Header botStatus={null} isConnected={true} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backtest Configuration */}
          <div className="lg:col-span-1">
            <Card className="bg-dark-100 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Configurar Backtest</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Nome do Teste</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Teste EMA 9/21"
                      className="bg-dark-300 border-gray-600 text-white"
                      disabled={isRunning}
                    />
                  </div>

                  <div>
                    <Label htmlFor="config" className="text-gray-300">Configuração</Label>
                    <Select 
                      value={form.configId} 
                      onValueChange={(value) => setForm(prev => ({ ...prev, configId: value }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="bg-dark-300 border-gray-600 text-white">
                        <SelectValue placeholder="Selecione uma configuração" />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-300 border-gray-600">
                        {configurations.map((config: any) => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name} - {config.contratoPreferido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="period" className="text-gray-300">Período</Label>
                    <Select 
                      value={form.period} 
                      onValueChange={(value) => setForm(prev => ({ ...prev, period: value }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="bg-dark-300 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-300 border-gray-600">
                        <SelectItem value="1d">1 Dia</SelectItem>
                        <SelectItem value="1w">1 Semana</SelectItem>
                        <SelectItem value="1mo">1 Mês</SelectItem>
                        <SelectItem value="3mo">3 Meses</SelectItem>
                        <SelectItem value="6mo">6 Meses</SelectItem>
                        <SelectItem value="1y">1 Ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="interval" className="text-gray-300">Timeframe</Label>
                    <Select 
                      value={form.interval} 
                      onValueChange={(value) => setForm(prev => ({ ...prev, interval: value }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="bg-dark-300 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-300 border-gray-600">
                        <SelectItem value="1m">1 Minuto</SelectItem>
                        <SelectItem value="5m">5 Minutos</SelectItem>
                        <SelectItem value="15m">15 Minutos</SelectItem>
                        <SelectItem value="30m">30 Minutos</SelectItem>
                        <SelectItem value="1h">1 Hora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isRunning || !form.configId || !form.name}
                  >
                    {isRunning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Executar Backtest
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            <Card className="bg-dark-100 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Resultados dos Backtests</CardTitle>
              </CardHeader>
              <CardContent>
                {backtestResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">Nenhum backtest executado ainda</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Configure e execute seu primeiro backtest
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {backtestResults.map((result: any) => (
                      <Card key={result.id} className="bg-dark-300 border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-medium">{result.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-gray-300 border-gray-600">
                                {getPeriodLabel(result.period)}
                              </Badge>
                              <Badge variant="outline" className="text-gray-300 border-gray-600">
                                {getIntervalLabel(result.interval)}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-xs text-gray-400">Retorno Total</span>
                              </div>
                              <p className={`font-mono font-bold ${
                                parseFloat(result.totalReturn) >= 0 ? "text-green-500" : "text-red-500"
                              }`}>
                                {formatCurrency(parseFloat(result.totalReturn))}
                              </p>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <Percent className="w-4 h-4 text-blue-500 mr-1" />
                                <span className="text-xs text-gray-400">Win Rate</span>
                              </div>
                              <p className="font-mono font-bold text-white">
                                {result.winRate.toFixed(1)}%
                              </p>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-xs text-gray-400">Trades</span>
                              </div>
                              <p className="font-mono font-bold text-white">
                                {result.totalTrades}
                              </p>
                              <p className="text-xs text-gray-400">
                                {result.winningTrades}W / {result.losingTrades}L
                              </p>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                                <span className="text-xs text-gray-400">Max DD</span>
                              </div>
                              <p className="font-mono font-bold text-red-500">
                                {formatCurrency(parseFloat(result.maxDrawdown || "0"))}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">Desempenho</span>
                              <span className="text-white">
                                {result.winRate.toFixed(1)}% Win Rate
                              </span>
                            </div>
                            <Progress 
                              value={result.winRate}
                              className="h-2"
                            />
                          </div>

                          <div className="mt-3 text-xs text-gray-500">
                            Executado em {new Date(result.createdAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(result.createdAt).toLocaleTimeString('pt-BR')}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
