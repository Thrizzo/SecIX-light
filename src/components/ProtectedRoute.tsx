import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Hidden auth URL for SaaS mode
const SAAS_AUTH_URL = '/x7k9m2p4q8w1n5v3b6h0j4f2ry9t6e3a8c1d5g0i2l7o4s';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Self-hosted: redirect to root (visible auth page)
    // SaaS: redirect to hidden auth URL
    const authPath = config.isSelfHosted() ? '/' : SAAS_AUTH_URL;
    return <Navigate to={authPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
