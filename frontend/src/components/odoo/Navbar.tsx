import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole, getRoleHomePath } from '../../context/AuthContext';
import { NotificationBell } from '../common/NotificationBell';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTh,
  faSun,
  faMobileAlt,
  faGlobe,
  faTachometerAlt,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
  appName: string;
  onToggleHomeMenu: () => void;
  isHomeMenuOpen: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin (Director)',
  sales: 'Sales Officer',
  technician: 'Technician (Field)',
  warehouse: 'Warehouse Manager',
  customer: 'Customer Portal',
};

export const Navbar: React.FC<NavbarProps> = ({ appName, onToggleHomeMenu, isHomeMenuOpen }) => {
  const { user, role, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <nav className="bg-odoo-primary text-white h-11 px-3 flex items-center justify-between text-sm select-none z-40 sticky top-0 w-full shadow-sm">
      {/* Left: App Grid & App Name */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleHomeMenu}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            isHomeMenuOpen ? 'bg-white/20' : ''
          }`}
          title="Apps Menu"
        >
          <FontAwesomeIcon icon={faTh} className="text-base" />
        </button>

        <span className="font-semibold tracking-wide flex items-center gap-2">
          <FontAwesomeIcon icon={faSun} className="text-amber-400" />
          <span>RoofRay</span>
          <span className="text-white/60">/</span>
          <span className="text-white font-medium">{appName}</span>
        </span>
      </div>

      {/* Right: Systray */}
      <div className="flex items-center space-x-3">
        <NotificationBell />

        {/* User Avatar & Logged-in User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1 rounded hover:bg-white/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-odoo-accent text-white flex items-center justify-center text-xs font-bold uppercase">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <span className="text-xs font-medium hidden md:inline">{user?.full_name || 'User'}</span>
            <span className="text-[10px] uppercase bg-white/20 px-1.5 py-0.5 rounded text-white/90">
              {role}
            </span>
          </button>

          {showUserMenu && (
            <>
              {/* Click-outside backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />

              <div className="absolute right-0 mt-1 w-64 bg-white text-odoo-text rounded shadow-xl border border-odoo-border py-1 text-xs z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Logged in User Information & Single Assigned Role */}
                <div className="px-3.5 py-2.5 border-b border-odoo-border bg-gray-50/80">
                  <div className="font-semibold text-gray-800 text-sm leading-tight">
                    {user?.full_name || 'Logged-in User'}
                  </div>
                  <div className="text-gray-500 text-[11px] truncate mt-0.5">
                    {user?.email}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(getRoleHomePath(role));
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTachometerAlt} className="text-odoo-primary w-3.5" />
                    <span>My Workspace</span>
                  </button>

                  {role === 'technician' && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/pwa/tech');
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      <FontAwesomeIcon icon={faMobileAlt} className="text-teal-600 w-3.5" />
                      <span>Mobile Technician PWA</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/');
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faGlobe} className="text-gray-500 w-3.5" />
                    <span>Public Website</span>
                  </button>
                </div>

                <div className="border-t border-odoo-border pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

