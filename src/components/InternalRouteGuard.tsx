import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface InternalRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Guards a route so it's only accessible via internal navigation (with state.fromInternal = true).
 * Direct URL access redirects to "/".
 */
const InternalRouteGuard: React.FC<InternalRouteGuardProps> = ({ children }) => {
  const location = useLocation();
  const state = location.state as { fromInternal?: boolean } | null;

  // Only allow access if navigated internally with the flag
  if (!state?.fromInternal) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default InternalRouteGuard;
