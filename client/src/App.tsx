import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Trading from "@/pages/Trading";
import Backtest from "@/pages/Backtest";
import Configuration from "@/pages/Configuration";
import TradeHistory from "@/pages/TradeHistory";
import ApiConnections from "@/pages/ApiConnections";
import Tests from "@/pages/Tests";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/trading" component={Trading} />
          <Route path="/backtest" component={Backtest} />
          <Route path="/configuration" component={Configuration} />
          <Route path="/trades" component={TradeHistory} />
          <Route path="/api" component={ApiConnections} />
          <Route path="/tests" component={Tests} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
