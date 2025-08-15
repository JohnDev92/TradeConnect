import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBotConfigurationSchema } from "@shared/schema";
import { z } from "zod";
import { X, Plus, Clock } from "lucide-react";

const formSchema = insertBotConfigurationSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  horariosEntrada: z.array(z.string()).min(1, "Pelo menos um horário é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  configuration?: any;
}

const defaultHorarios = ["10:00", "13:00", "15:30"];

export default function ConfigurationModal({
  isOpen,
  onClose,
  configuration
}: ConfigurationModalProps) {
  const [customHorario, setCustomHorario] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contratos: 1,
      metaLucroDiario: "500.00",
      stopLossPontos: 150,
      maxTradesDia: 3,
      contratoPreferido: "WIN",
      usarHorarioDinamico: true,
      trailingStopAtivo: true,
      trailingStopPontos: 50,
      horariosEntrada: defaultHorarios,
      isActive: false,
    },
  });

  // Load configuration data when editing
  useEffect(() => {
    if (configuration) {
      form.reset({
        name: configuration.name,
        contratos: configuration.contratos,
        metaLucroDiario: configuration.metaLucroDiario,
        stopLossPontos: configuration.stopLossPontos,
        maxTradesDia: configuration.maxTradesDia,
        contratoPreferido: configuration.contratoPreferido,
        usarHorarioDinamico: configuration.usarHorarioDinamico,
        trailingStopAtivo: configuration.trailingStopAtivo,
        trailingStopPontos: configuration.trailingStopPontos,
        horariosEntrada: Array.isArray(configuration.horariosEntrada) 
          ? configuration.horariosEntrada 
          : defaultHorarios,
        isActive: configuration.isActive,
      });
    } else {
      form.reset({
        name: "",
        contratos: 1,
        metaLucroDiario: "500.00",
        stopLossPontos: 150,
        maxTradesDia: 3,
        contratoPreferido: "WIN",
        usarHorarioDinamico: true,
        trailingStopAtivo: true,
        trailingStopPontos: 50,
        horariosEntrada: defaultHorarios,
        isActive: false,
      });
    }
  }, [configuration, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/bot-configurations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-configurations"] });
      onClose();
      toast({
        title: "Configuração Criada",
        description: "Nova configuração criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar configuração",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("PUT", `/api/bot-configurations/${configuration.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-configurations"] });
      onClose();
      toast({
        title: "Configuração Atualizada",
        description: "Configuração atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar configuração",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (configuration) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addCustomHorario = () => {
    if (!customHorario) return;
    
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(customHorario)) {
      toast({
        title: "Formato Inválido",
        description: "Use o formato HH:MM (ex: 14:30)",
        variant: "destructive",
      });
      return;
    }

    const currentHorarios = form.getValues("horariosEntrada");
    if (currentHorarios.includes(customHorario)) {
      toast({
        title: "Horário Duplicado",
        description: "Este horário já foi adicionado",
        variant: "destructive",
      });
      return;
    }

    const newHorarios = [...currentHorarios, customHorario].sort();
    form.setValue("horariosEntrada", newHorarios);
    setCustomHorario("");
  };

  const removeHorario = (horario: string) => {
    const currentHorarios = form.getValues("horariosEntrada");
    const newHorarios = currentHorarios.filter(h => h !== horario);
    form.setValue("horariosEntrada", newHorarios);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-100 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {configuration ? "Editar Configuração" : "Nova Configuração"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
                Configuração Básica
              </h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Nome da Configuração</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Estratégia EMA Conservadora"
                        className="bg-dark-300 border-gray-600 text-white"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contratoPreferido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Contrato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger className="bg-dark-300 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-dark-300 border-gray-600">
                          <SelectItem value="WIN">WIN - Mini Índice Bovespa</SelectItem>
                          <SelectItem value="WDO">WDO - Mini Dólar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contratos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Quantidade de Contratos</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="10"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-dark-300 border-gray-600 text-white"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
                Configuração Financeira
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="metaLucroDiario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Meta de Lucro Diário (R$)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="50"
                          placeholder="500.00"
                          className="bg-dark-300 border-gray-600 text-white"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stopLossPontos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Stop Loss (pontos)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="10"
                          step="5"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-dark-300 border-gray-600 text-white"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTradesDia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Máximo de Trades por Dia</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="10"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-dark-300 border-gray-600 text-white"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailingStopPontos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Trailing Stop (pontos)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="5"
                          step="5"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="bg-dark-300 border-gray-600 text-white"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
                Opções Avançadas
              </h3>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="trailingStopAtivo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 bg-dark-300 rounded-lg">
                      <div>
                        <FormLabel className="text-white font-medium">Ativar Trailing Stop</FormLabel>
                        <p className="text-sm text-gray-400">
                          Ajusta automaticamente o stop loss conforme o preço se move favoravelmente
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usarHorarioDinamico"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 bg-dark-300 rounded-lg">
                      <div>
                        <FormLabel className="text-white font-medium">Horários Dinâmicos</FormLabel>
                        <p className="text-sm text-gray-400">
                          Ajusta horários de entrada baseado na volatilidade do mercado
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Trading Hours */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-gray-700 pb-2">
                Horários de Entrada
              </h3>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {form.watch("horariosEntrada").map((horario, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-blue-500/20 text-blue-400 border-blue-500/50 px-3 py-1"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {horario}
                      <button
                        type="button"
                        onClick={() => removeHorario(horario)}
                        className="ml-2 hover:text-red-400"
                        disabled={isPending}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <Input
                    value={customHorario}
                    onChange={(e) => setCustomHorario(e.target.value)}
                    placeholder="HH:MM (ex: 14:30)"
                    className="bg-dark-300 border-gray-600 text-white"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    onClick={addCustomHorario}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    disabled={isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {configuration ? "Atualizando..." : "Criando..."}
                  </>
                ) : (
                  configuration ? "Atualizar Configuração" : "Criar Configuração"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
