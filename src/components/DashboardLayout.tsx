/**
 * SecIX Light Edition - Dashboard Layout
 * 
 * Navigation with only Light edition modules:
 * - Dashboard
 * - Security Journey  
 * - Risk Management
 * - Asset Management
 * - Control Library
 * - Data Protection
 * - Settings
 */

import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJourney } from "@/contexts/JourneyContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  AlertTriangle,
  Database,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Compass,
  Lock,
} from "lucide-react";
import NavLink from "@/components/NavLink";
import AIAssistantButton from "@/components/assistant/AIAssistantButton";

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const { journeyProgress } = useJourney();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show journey if not completed
  const showJourney = !journeyProgress?.journey_completed;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/signed-out");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Light Edition navigation items only
  const navItems = [
    ...(showJourney
      ? [{ to: "/dashboard/journey", icon: Compass, label: "Security Journey" }]
      : []),
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/dashboard/risks", icon: AlertTriangle, label: "Risk Management" },
    { to: "/dashboard/assets", icon: Database, label: "Asset Management" },
    { to: "/dashboard/controls", icon: ShieldCheck, label: "Control Library" },
    { to: "/dashboard/data-protection", icon: Lock, label: "Data Protection" },
    { to: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">SecIX</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              GRC Platform
              <Badge variant="secondary" className="text-[10px] px-1 py-0">Light</Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              end={item.end}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Sign Out */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-sm">SecIX</h1>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">Light</Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-[65px] left-0 bottom-0 w-64 bg-card border-r border-border z-50 transform transition-transform duration-200 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ScrollArea className="h-full">
          <nav className="space-y-2 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                end={item.end}
              />
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="pt-[65px] lg:pt-0">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </main>

      {/* AI Assistant Button */}
      <AIAssistantButton />
    </div>
  );
};

export default DashboardLayout;
