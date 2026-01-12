/**
 * SecIX Light Edition - Main Application Router
 * 
 * Contains only Light edition routes:
 * - Dashboard
 * - Security Journey
 * - Risk Management
 * - Control Library
 * - Asset Management
 * - Data Protection
 * - Settings
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { JourneyProvider } from "@/contexts/JourneyContext";

// Auth Pages
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import InviteSignup from "@/pages/InviteSignup";
import SignedOut from "@/pages/SignedOut";
import NotFound from "@/pages/NotFound";

// Protected Pages (Light Edition)
import Dashboard from "@/pages/Dashboard";
import SecurityJourneyPage from "@/pages/SecurityJourneyPage";
import RiskManagement from "@/pages/RiskManagement";
import ControlManagement from "@/pages/ControlManagement";
import AssetManagement from "@/pages/AssetManagement";
import DataProtection from "@/pages/DataProtection";
import Settings from "@/pages/Settings";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

const AppRoutes: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <JourneyProvider>
      <Routes>
        {/* Root route - Login screen or redirect to dashboard */}
        <Route
          path="/"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Auth />
          }
        />
        
        {/* Auth routes */}
        <Route
          path="/auth"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Auth />
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/invite/:token" element={<InviteSignup />} />
        <Route path="/signed-out" element={<SignedOut />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default Dashboard */}
          <Route index element={<Dashboard />} />
          
          {/* Security Journey */}
          <Route path="journey" element={<SecurityJourneyPage />} />
          
          {/* Risk Management */}
          <Route path="risks" element={<RiskManagement />} />
          
          {/* Asset Management */}
          <Route path="assets" element={<AssetManagement />} />
          
          {/* Control Library */}
          <Route path="controls" element={<ControlManagement />} />
          
          {/* Data Protection */}
          <Route path="data-protection" element={<DataProtection />} />
          
          {/* Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </JourneyProvider>
  );
};

const SupabaseApp: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default SupabaseApp;
