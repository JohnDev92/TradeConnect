import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, Search, TrendingUp, TrendingDown } from "lucide-react";

export default function TradeHistory() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const limit = 20;

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["/api/trades", { limit, offset: currentPage * limit, status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const { data: dailyMetrics } = useQuery({
    queryKey: ["/api/metrics/daily"],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; label: string } } = {
      'ATIVO': { variant: 'default', label: 'Ativo' },
      'FECHADO': { variant: 'secondary', label: 'Fechado' },
      'CANCELADO': { variant: 'destructive', label: 'Cancelado' }
    };
    
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === 'COMPRA' ? 'default' : 'secondary'} className={
        tipo === 'COMPRA' 
          ? 'bg-green-500/20 text-green-400 border-green-500/50' 
          : 'bg-red-500/20 text-red-400 border-red-500/50'
      }>
        {tipo}
      </Badge>
    );
  };

  const getResultColor = (resultado: string | number) => {
    const value = typeof resultado === 'string' ? parseFloat(resultado) : resultado;
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  const getResultIcon = (resultado: string | number) => {
    const value = typeof resultado === 'string' ? parseFloat(resultado) : resultado;
    if (value > 0) return <TrendingUp className="w-4 h-4" />;
    if (value < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  const filteredTrades = trades.filter((trade: any) => {
    const matchesSearch = !searchTerm || 
      trade.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const exportTrades = () => {
    // Create CSV data
    const headers = ['Data', 'Horário', 'Contrato', 'Tipo', 'Entrada', 'Saída', 'Resultado', 'Status'];
    const csvData = filteredTrades.map((trade: any) => {
      const entryDateTime = formatDateTime(trade.horarioEntrada);
      const exitDateTime = trade.horarioSaida ? formatDateTime(trade.horarioSaida) : { date: '', time: '' };
      
      return [
        entryDateTime.date,
        entryDateTime.time,
        trade.contrato,
        trade.tipo,
        trade.pontosEntrada.toFixed(1),
        trade.pontosSaida ? trade.pontosSaida.toFixed(1) : '',
        trade.resultado ? parseFloat(trade.resultado).toFixed(2) : '0.00',
        trade.status
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-dark-200">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="text-white text-center py-8">Carregando histórico...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-6">
        <Header botStatus={null} isConnected={true} />
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-dark-100 border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Total de Trades</p>
                <p className="text-2xl font-bold text-white">{dailyMetrics?.totalTrades || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-100 border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Trades Vencedores</p>
                <p className="text-2xl font-bold text-green-500">{dailyMetrics?.winningTrades || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-100 border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-white">
                  {dailyMetrics?.winRate ? `${dailyMetrics.winRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-100 border-gray-700">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Lucro Total</p>
                <p className={`text-2xl font-bold ${getResultColor(dailyMetrics?.totalProfit || 0)}`}>
                  {formatCurrency(dailyMetrics?.totalProfit || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-dark-100 border-gray-700 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Histórico de Trades</CardTitle>
              <Button onClick={exportTrades} variant="outline" className="border-gray-600 text-gray-300">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por contrato ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-dark-300 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-dark-300 border-gray-600 text-white">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-dark-300 border-gray-600">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="FECHADO">Fechado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trades Table */}
        <Card className="bg-dark-100 border-gray-700">
          <CardContent className="p-0">
            {filteredTrades.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Nenhum Trade Encontrado
                </h3>
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== "all" 
                    ? "Tente ajustar os filtros de busca" 
                    : "Quando você executar trades, eles aparecerão aqui"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Data/Hora</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Contrato</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Tipo</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Entrada</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Saída</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Resultado</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((trade: any) => {
                      const entryDateTime = formatDateTime(trade.horarioEntrada);
                      const exitDateTime = trade.horarioSaida ? formatDateTime(trade.horarioSaida) : null;
                      
                      return (
                        <tr key={trade.id} className="border-b border-gray-800 hover:bg-dark-300 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-mono text-sm text-gray-300">
                              <div>{entryDateTime.date}</div>
                              <div className="text-xs text-gray-500">{entryDateTime.time}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-medium text-white">{trade.contrato}</span>
                          </td>
                          <td className="py-4 px-6">
                            {getTypeBadge(trade.tipo)}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-white">{trade.pontosEntrada.toFixed(1)}</span>
                          </td>
                          <td className="py-4 px-6">
                            {trade.pontosSaida ? (
                              <span className="font-mono text-white">{trade.pontosSaida.toFixed(1)}</span>
                            ) : (
                              <span className="text-gray-500">--</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className={`flex items-center space-x-1 font-mono ${getResultColor(trade.resultado || 0)}`}>
                              {getResultIcon(trade.resultado || 0)}
                              <span>{formatCurrency(trade.resultado || 0)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(trade.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {filteredTrades.length >= limit && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="border-gray-600 text-gray-300"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={filteredTrades.length < limit}
                className="border-gray-600 text-gray-300"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
