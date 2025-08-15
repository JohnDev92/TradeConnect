import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wifi, WifiOff, TestTube, Edit, Trash2, Eye, EyeOff } from "lucide-react";

interface ConnectionForm {
  name: string;
  provider: string;
  credentials: any;
}

const providers = [
  { value: 'CLEAR', label: 'Clear Corretora', fields: ['apiKey', 'apiSecret'] },
  { value: 'XP', label: 'XP Investimentos', fields: ['clientId', 'clientSecret'] },
  { value: 'RICO', label: 'Rico Investimentos', fields: ['username', 'password'] },
];

export default function ApiConnections() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);
  const [showCredentials, setShowCredentials] = useState<{ [key: string]: boolean }>({});
  const [form, setForm] = useState<ConnectionForm>({
    name: "",
    provider: "",
    credentials: {}
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["/api/connections"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ConnectionForm) => {
      return await apiRequest("POST", "/api/connections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      setIsModalOpen(false);
      resetForm();
      toast({
        title: "Conexão Criada",
        description: "Conexão API criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar conexão",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Conexão Deletada",
        description: "Conexão removida com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao deletar conexão",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/connections/${id}/test`);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: result.success ? "Conexão Bem-sucedida" : "Falha na Conexão",
        description: result.success 
          ? `Conectado em ${result.latency}ms` 
          : result.error,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao testar conexão",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      provider: "",
      credentials: {}
    });
    setEditingConnection(null);
  };

  const handleProviderChange = (provider: string) => {
    setForm(prev => ({
      ...prev,
      provider,
      credentials: {}
    }));
  };

  const handleCredentialChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProvider = providers.find(p => p.value === form.provider);
    if (!selectedProvider) return;

    // Validate required fields
    const missingFields = selectedProvider.fields.filter(field => !form.credentials[field]);
    if (missingFields.length > 0) {
      toast({
        title: "Campos Obrigatórios",
        description: `Preencha: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(form);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; label: string; icon: any } } = {
      'CONNECTED': { variant: 'default', label: 'Conectado', icon: Wifi },
      'DISCONNECTED': { variant: 'secondary', label: 'Desconectado', icon: WifiOff },
      'ERROR': { variant: 'destructive', label: 'Erro', icon: WifiOff }
    };
    
    const config = variants[status] || { variant: 'secondary', label: status, icon: WifiOff };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const toggleCredentialVisibility = (connectionId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };

  const maskCredential = (value: string) => {
    if (!value) return "";
    if (value.length <= 4) return "*".repeat(value.length);
    return value.substring(0, 2) + "*".repeat(value.length - 4) + value.substring(value.length - 2);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-dark-200">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="text-white text-center py-8">Carregando conexões...</div>
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
            <h2 className="text-2xl font-bold text-white">Conexões API</h2>
            <p className="text-gray-400">Gerencie suas conexões com corretoras</p>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conexão
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-dark-100 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Nova Conexão API</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-300">Nome da Conexão</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Clear - Conta Principal"
                    className="bg-dark-300 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="provider" className="text-gray-300">Corretora</Label>
                  <Select value={form.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="bg-dark-300 border-gray-600 text-white">
                      <SelectValue placeholder="Selecione uma corretora" />
                    </SelectTrigger>
                    <SelectContent className="bg-dark-300 border-gray-600">
                      {providers.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.provider && (
                  <div className="space-y-3">
                    <Label className="text-gray-300">Credenciais</Label>
                    {providers
                      .find(p => p.value === form.provider)
                      ?.fields.map((field) => (
                        <div key={field}>
                          <Label htmlFor={field} className="text-gray-300 capitalize">
                            {field === 'apiKey' ? 'API Key' :
                             field === 'apiSecret' ? 'API Secret' :
                             field === 'clientId' ? 'Client ID' :
                             field === 'clientSecret' ? 'Client Secret' :
                             field}
                          </Label>
                          <Input
                            id={field}
                            type={field.includes('secret') || field.includes('password') ? 'password' : 'text'}
                            value={form.credentials[field] || ''}
                            onChange={(e) => handleCredentialChange(field, e.target.value)}
                            className="bg-dark-300 border-gray-600 text-white"
                            required
                          />
                        </div>
                      ))
                    }
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Conexão"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {connections.length === 0 ? (
          <Card className="bg-dark-100 border-gray-700">
            <CardContent className="py-12">
              <div className="text-center">
                <Wifi className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Nenhuma Conexão Configurada
                </h3>
                <p className="text-gray-400 mb-6">
                  Conecte-se com sua corretora para executar trades automaticamente
                </p>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Conexão
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {connections.map((connection: any) => (
              <Card key={connection.id} className="bg-dark-100 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{connection.name}</CardTitle>
                    {getStatusBadge(connection.connectionStatus)}
                  </div>
                  <p className="text-gray-400 text-sm">{connection.provider}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Connection Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Último Teste:</span>
                        <span className="text-white">
                          {connection.lastConnectionTest 
                            ? new Date(connection.lastConnectionTest).toLocaleString('pt-BR')
                            : 'Nunca testado'
                          }
                        </span>
                      </div>
                      
                      {connection.errorMessage && (
                        <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
                          {connection.errorMessage}
                        </div>
                      )}
                    </div>

                    {/* Credentials Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Credenciais:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCredentialVisibility(connection.id)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          {showCredentials[connection.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      
                      {connection.credentials && (
                        <div className="text-xs space-y-1">
                          {Object.entries(connection.credentials).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-500 capitalize">{key}:</span>
                              <span className="text-gray-300 font-mono">
                                {showCredentials[connection.id] 
                                  ? value as string
                                  : maskCredential(value as string)
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testConnectionMutation.mutate(connection.id)}
                        disabled={testConnectionMutation.isPending}
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Testar
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja deletar esta conexão?")) {
                            deleteMutation.mutate(connection.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
