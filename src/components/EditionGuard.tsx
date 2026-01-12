import React from 'react';
import { Navigate } from 'react-router-dom';
import { edition } from '@/lib/edition';

interface EditionGuardProps {
  /**
   * The minimum edition required to access this route
   * Currently only 'full' is supported as a guard
   */
  requiredEdition: 'full';
  /**
   * The content to render if the edition requirement is met
   */
  children: React.ReactNode;
  /**
   * Optional redirect path (defaults to /dashboard)
   */
  redirectTo?: string;
}

/**
 * EditionGuard - Route guard component that restricts access based on edition
 * 
 * Used to protect routes that are only available in the Full edition.
 * In Light edition, users are redirected to the dashboard.
 * 
 * @example
 * <Route path="vendors" element={
 *   <EditionGuard requiredEdition="full">
 *     <VendorManagement />
 *   </EditionGuard>
 * } />
 */
const EditionGuard: React.FC<EditionGuardProps> = ({ 
  requiredEdition, 
  children, 
  redirectTo = '/dashboard' 
}) => {
  // If full edition is required but we're running light, redirect
  if (requiredEdition === 'full' && edition.isLight()) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

export default EditionGuard;
