import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";

export default function TradesTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["/api/trades", { limit: 10, offset: 0 }],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; label: string } } = {
      'ATIVO': { variant: 'default', label: 'Ativo' },
      'FECHADO': { variant: 'secondary', label: 'Fechado' },
      'CANCELADO': { variant: 'destructive', label: 'Cancelado' }
    };
    
    const config = variants[status] || { variant: 'secondary', label: status };
    
    return (
      <Badge 
        variant={config.variant}
        className={
          status === 'ATIVO' 
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
            : undefined
        }
      >
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (tipo: string) => {
    return (
      <Badge 
        variant="outline"
        className={
          tipo === 'COMPRA' 
            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
            : 'bg-red-500/20 text-red-400 border-red-500/50'
        }
      >
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
    if (!searchTerm) return true;
    
    return (
      trade.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <Card className="bg-dark-100 border-gray-700">
        <CardContent className="py-8">
          <div className="text-center text-gray-400">Carregando trades...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-100 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white">Trades Recentes</CardTitle>
          <Link href="/trades">
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
              <Eye className="w-4 h-4 mr-2" />
              Ver Todos
            </Button>
          </Link>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar trades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-dark-300 border-gray-600 text-white"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-8">
            <ArrowUpDown className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? "Nenhum trade encontrado" : "Nenhum trade executado hoje"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Horário</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Entrada</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Saída</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Resultado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade: any) => (
                  <tr key={trade.id} className="border-b border-gray-800 hover:bg-dark-300 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-300 text-sm">
                      {formatTime(trade.horarioEntrada)}
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(trade.tipo)}
                    </td>
                    <td className="py-3 px-4 font-mono text-white text-sm">
                      {trade.pontosEntrada.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 font-mono text-white text-sm">
                      {trade.pontosSaida ? trade.pontosSaida.toFixed(1) : '--'}
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center space-x-1 font-mono text-sm ${getResultColor(trade.resultado || 0)}`}>
                        {getResultIcon(trade.resultado || 0)}
                        <span>{formatCurrency(trade.resultado || 0)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(trade.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
