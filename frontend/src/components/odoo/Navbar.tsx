import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTh,
  faBell,
  faUserCircle,
  faSun,
  faMobileAlt,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
  appName: string;
  onToggleHomeMenu: () => void;
  isHomeMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ appName, onToggleHomeMenu, isHomeMenuOpen }) => {
  const { user, role, switchRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const roles: { id: UserRole; label: string }[] = [
    { id: 'admin', label: 'Admin (Director)' },
    { id: 'sales', label: 'Sales Officer' },
    { id: 'technician', label: 'Technician (Field)' },
    { id: 'warehouse', label: 'Warehouse Manager' },
    { id: 'support', label: 'Helpdesk Support' },
    { id: 'accounts', label: 'Accounts Officer' },
  ];

  return (
    <nav className="bg-odoo-primary text-white h-11 px-3 flex items-center justify-between text-sm select-none z-40 relative shadow-sm">
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
          <span>SunPower</span>
          <span className="text-white/60">/</span>
          <span className="text-white font-medium">{appName}</span>
        </span>
      </div>

      {/* Right: Systray */}
      <div className="flex items-center space-x-3">
        {/* Quick Links: Website & Tech Mobile PWA */}
        <Link
          to="/"
          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors"
          title="Customer Website"
        >
          <FontAwesomeIcon icon={faGlobe} />
          <span className="hidden sm:inline">Website</span>
        </Link>

        <Link
          to="/pwa/tech"
          className="text-xs px-2 py-1 rounded bg-odoo-accent hover:bg-odoo-accent-dark flex items-center gap-1.5 transition-colors font-medium"
          title="Technician Mobile View"
        >
          <FontAwesomeIcon icon={faMobileAlt} />
          <span className="hidden sm:inline">Tech PWA</span>
        </Link>

        {/* Notifications Icon */}
        <button className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white relative" title="Notifications">
          <FontAwesomeIcon icon={faBell} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-odoo-accent rounded-full"></span>
        </button>

        {/* User Avatar & Fast Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1 rounded hover:bg-white/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-odoo-accent text-white flex items-center justify-center text-xs font-bold uppercase">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <span className="text-xs font-medium hidden md:inline">{user?.full_name || 'Admin'}</span>
            <span className="text-[10px] uppercase bg-white/20 px-1.5 py-0.5 rounded text-white/90">
              {role}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white text-odoo-text rounded shadow-xl border border-odoo-border py-1 text-xs z-50">
              <div className="px-3 py-2 border-b border-odoo-border bg-gray-50">
                <div className="font-semibold text-gray-800">{user?.full_name}</div>
                <div className="text-gray-500 text-[11px]">{user?.email}</div>
              </div>

              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Switch Staff Role (Demo)
              </div>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    switchRole(r.id);
                    setShowUserMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-odoo-bg transition-colors ${
                    role === r.id ? 'font-bold text-odoo-primary bg-purple-50' : 'text-gray-700'
                  }`}
                >
                  <span>{r.label}</span>
                  {role === r.id && <span className="w-1.5 h-1.5 rounded-full bg-odoo-primary"></span>}
                </button>
              ))}

              <div className="border-t border-odoo-border mt-1 pt-1">
                <button
                  onClick={() => {
                    navigate('/login');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

