import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Bot, Shield, TrendingUp, Zap, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-200 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold">TradingBot Pro</h1>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Automatize Seus Trades
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Sistema profissional de day trading automatizado para WIN e WDO com estratégias avançadas, 
            backtesting completo e integração real com corretoras brasileiras.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              onClick={() => window.location.href = '/api/login'}
            >
              Começar Agora
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 text-lg"
            >
              Ver Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Recursos Principais</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <Bot className="w-12 h-12 text-blue-500 mb-4" />
              <CardTitle className="text-white">Trading Automatizado</CardTitle>
              <CardDescription className="text-gray-400">
                Bot inteligente com estratégias EMA, RSI e MACD para WIN e WDO
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <TrendingUp className="w-12 h-12 text-green-500 mb-4" />
              <CardTitle className="text-white">Backtesting Avançado</CardTitle>
              <CardDescription className="text-gray-400">
                Teste suas estratégias com dados históricos reais antes de operar
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <Shield className="w-12 h-12 text-red-500 mb-4" />
              <CardTitle className="text-white">Gestão de Risco</CardTitle>
              <CardDescription className="text-gray-400">
                Stop loss, trailing stop e limites diários para proteger seu capital
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <Zap className="w-12 h-12 text-yellow-500 mb-4" />
              <CardTitle className="text-white">Tempo Real</CardTitle>
              <CardDescription className="text-gray-400">
                Dados de mercado em tempo real e execução instantânea de ordens
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <Users className="w-12 h-12 text-purple-500 mb-4" />
              <CardTitle className="text-white">APIs Integradas</CardTitle>
              <CardDescription className="text-gray-400">
                Conecte com Clear, XP, Rico e outras corretoras brasileiras
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-dark-100 border-gray-700">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-blue-500 mb-4" />
              <CardTitle className="text-white">Dashboard Completo</CardTitle>
              <CardDescription className="text-gray-400">
                Monitore performance, trades e métricas em interface profissional
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-dark-100 border-y border-gray-700">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-green-500 mb-2">85%</div>
              <div className="text-gray-400">Taxa de Acerto Média</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-500 mb-2">1000+</div>
              <div className="text-gray-400">Trades Executados</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-500 mb-2">R$ 50k+</div>
              <div className="text-gray-400">Lucro Acumulado</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h3 className="text-3xl font-bold mb-6">Pronto para Automatizar Seus Trades?</h3>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Junte-se aos traders que já estão usando nossa plataforma para 
          maximizar resultados e minimizar riscos no day trade.
        </p>
        <Button 
          size="lg" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
          onClick={() => window.location.href = '/api/login'}
        >
          Começar Gratuitamente
        </Button>
      </div>

      {/* Footer */}
      <footer className="bg-dark-100 border-t border-gray-700">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TradingBot Pro</span>
          </div>
          <p className="text-center text-gray-400 mt-4">
            © 2024 TradingBot Pro. Sistema profissional de trading automatizado.
          </p>
        </div>
      </footer>
    </div>
  );
}
