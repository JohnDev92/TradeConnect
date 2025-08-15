import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StopCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  botStatus?: any;
  isConnected: boolean;
}

export default function Header({ botStatus, isConnected }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const emergencyStopMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/bot/emergency-stop");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
      toast({
        title: "Parada de Emergência",
        description: "Bot parado com segurança",
        variant: "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao executar parada de emergência",
        variant: "destructive",
      });
    },
  });

  const handleEmergencyStop = () => {
    if (confirm("Tem certeza que deseja parar o bot imediatamente?")) {
      emergencyStopMutation.mutate();
    }
  };

  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400">Monitoramento em tempo real</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Bot Status */}
        <div className="flex items-center space-x-2 bg-dark-100 px-4 py-2 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${
            botStatus?.isActive 
              ? "bg-green-500 animate-pulse" 
              : "bg-gray-500"
          }`} />
          <span className="text-sm font-medium text-white">
            {botStatus?.isActive ? "Bot Ativo" : "Bot Inativo"}
          </span>
        </div>

        {/* WebSocket Connection Status */}
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "Conectado" : "Desconectado"}
        </Badge>
        
        {/* Real-time clock */}
        <div className="text-sm font-mono text-gray-300">
          {currentTime.toLocaleTimeString('pt-BR', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        
        {/* Emergency Stop */}
        <Button 
          variant="destructive"
          size="sm"
          onClick={handleEmergencyStop}
          disabled={emergencyStopMutation.isPending || !botStatus?.isActive}
          className="font-medium"
        >
          <StopCircle className="w-4 h-4 mr-2" />
          Stop
        </Button>
      </div>
    </header>
  );
}
