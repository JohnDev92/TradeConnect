import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Bot, 
  History, 
  Settings, 
  List, 
  Plug, 
  FlaskConical,
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";

const navigationItems = [
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/trading", icon: Bot, label: "Bot Trading" },
  { href: "/backtest", icon: History, label: "Backtest" },
  { href: "/configuration", icon: Settings, label: "Configurações" },
  { href: "/trades", icon: List, label: "Histórico" },
  { href: "/api", icon: Plug, label: "APIs" },
  { href: "/tests", icon: FlaskConical, label: "Testes" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: UserType | undefined };

  return (
    <aside className="w-64 bg-dark-100 border-r border-gray-700 h-screen fixed left-0 top-0 z-10">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">TradingBot Pro</h1>
        </div>
        
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/dashboard" && location === "/");
            
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-dark-300"
                }`}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {user?.firstName || user?.email || "Trader"}
            </p>
            <p className="text-xs text-gray-400">Trader Pro</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white p-2"
            onClick={() => window.location.href = "/api/logout"}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
