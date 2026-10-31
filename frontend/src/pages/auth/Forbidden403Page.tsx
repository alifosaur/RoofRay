import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleHomePath, UserRole } from '../../context/AuthContext';

interface ForbiddenProps {
  requiredRoles?: UserRole[];
  currentRole?: UserRole;
}

export const Forbidden403Page: React.FC<ForbiddenProps> = ({
  requiredRoles = [],
  currentRole,
}) => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const activeRole = currentRole || role;

  return (
    <div className="min-h-screen bg-odoo-canvas flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm max-w-md w-full p-8 text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-shield-halved text-2xl"></i>
        </div>

        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-700 bg-red-50 rounded mb-2">
          HTTP 403 Forbidden
        </span>

        <h1 className="text-xl font-bold text-odoo-dark mb-2">
          Access Restricted by Role Guard
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          Your account is signed in as <span className="font-semibold text-odoo-purple capitalize">{activeRole}</span>
          {user?.email && ` (${user.email})`}. This portal is restricted
          {requiredRoles.length > 0 && (
            <> to: <span className="font-semibold">{requiredRoles.join(', ')}</span></>
          )}.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => navigate(getRoleHomePath(activeRole))}
            className="w-full py-2 px-4 bg-odoo-purple hover:bg-odoo-purple-hover text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Go to My {activeRole.toUpperCase()} Dashboard
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded transition-colors"
          >
            Switch Account / Sign In as Another Role
          </button>
        </div>
      </div>
    </div>
  );
};
