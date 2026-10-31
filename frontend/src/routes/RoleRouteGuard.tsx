import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface RoleRouteGuardProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
}

export const RoleRouteGuard: React.FC<RoleRouteGuardProps> = ({ children, allowedRoles }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-odoo-canvas">
        <div className="flex flex-col items-center gap-3">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-odoo-purple"></i>
          <span className="text-sm font-medium text-gray-600">Verifying session permissions...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to all staff modules
  const currentRole = user?.role || role;
  const isAllowed = allowedRoles.includes(currentRole) || currentRole === 'admin';

  if (!isAllowed) {
    return <SignOutToLogin />;
  }

  return children;
};


/** A role that may not open this page is signed out and sent to the login page. */
const SignOutToLogin: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    logout().then(() => navigate('/login?denied=1', { replace: true }));
  }, []);
  return null;
};
