import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ConfigurationModal from "@/components/ConfigurationModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Settings, Play, Pause } from "lucide-react";

export default function Configuration() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configurations = [], isLoading } = useQuery({
    queryKey: ["/api/bot-configurations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bot-configurations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-configurations"] });
      toast({
        title: "Configuração Deletada",
        description: "Configuração removida com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao deletar configuração",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/api/bot-configurations/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-configurations"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar configuração",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingConfig(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta configuração?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-dark-200">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="text-white text-center py-8">Carregando configurações...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-6">
        <Header botStatus={null} isConnected={true} />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Configurações do Bot</h2>
            <p className="text-gray-400">Gerencie suas estratégias de trading</p>
          </div>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Configuração
          </Button>
        </div>

        {configurations.length === 0 ? (
          <Card className="bg-dark-100 border-gray-700">
            <CardContent className="py-12">
              <div className="text-center">
                <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Nenhuma Configuração
                </h3>
                <p className="text-gray-400 mb-6">
                  Crie sua primeira configuração de trading para começar
                </p>
                <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Configuração
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {configurations.map((config: any) => (
              <Card key={config.id} className="bg-dark-100 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{config.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: config.id, isActive: checked })
                        }
                        disabled={toggleActiveMutation.isPending}
                      />
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Contrato:</span>
                        <div className="font-medium text-white">{config.contratoPreferido}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Quantidade:</span>
                        <div className="font-medium text-white">{config.contratos}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Meta Diária:</span>
                        <div className="font-medium text-green-500">
                          {formatCurrency(config.metaLucroDiario)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Stop Loss:</span>
                        <div className="font-medium text-red-500">{config.stopLossPontos} pts</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Max Trades:</span>
                        <div className="font-medium text-white">{config.maxTradesDia}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Trailing Stop:</span>
                        <div className="font-medium text-white">
                          {config.trailingStopAtivo ? `${config.trailingStopPontos} pts` : "Inativo"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {config.usarHorarioDinamico && (
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          Horário Dinâmico
                        </Badge>
                      )}
                      {config.trailingStopAtivo && (
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Trailing Stop
                        </Badge>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">Horários de Entrada:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(config.horariosEntrada as string[]).map((horario, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {horario}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-700">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(config)}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(config.id)}
                      disabled={config.isActive || deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ConfigurationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          configuration={editingConfig}
        />
      </main>
    </div>
  );
}
