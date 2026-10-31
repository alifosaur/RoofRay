import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faClipboardCheck,
  faFileInvoiceDollar,
  faBoxes,
  faBarcode,
  faTools,
  faHeadset,
  faCalculator,
  faChartPie,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';

interface HomeMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppItem {
  id: string;
  name: string;
  path: string;
  icon: any;
  color: string;
  allowedRoles: UserRole[];
}

export const HomeMenu: React.FC<HomeMenuProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const apps: AppItem[] = [
    {
      id: 'crm',
      name: 'CRM',
      path: '/web/crm',
      icon: faUsers,
      color: 'bg-emerald-600',
      allowedRoles: ['admin', 'sales', 'support'],
    },
    {
      id: 'surveys',
      name: 'Surveys',
      path: '/web/surveys',
      icon: faClipboardCheck,
      color: 'bg-teal-600',
      allowedRoles: ['admin', 'sales', 'technician'],
    },
    {
      id: 'sales',
      name: 'Sales & Quotes',
      path: '/web/quotes',
      icon: faFileInvoiceDollar,
      color: 'bg-purple-600',
      allowedRoles: ['admin', 'sales', 'accounts'],
    },
    {
      id: 'orders',
      name: 'Orders',
      path: '/web/orders',
      icon: faClipboardCheck,
      color: 'bg-indigo-600',
      allowedRoles: ['admin', 'sales', 'warehouse', 'accounts'],
    },
    {
      id: 'inventory',
      name: 'Inventory',
      path: '/web/inventory',
      icon: faBoxes,
      color: 'bg-amber-600',
      allowedRoles: ['admin', 'warehouse'],
    },
    {
      id: 'dispatch',
      name: 'Dispatch',
      path: '/web/dispatch',
      icon: faBarcode,
      color: 'bg-cyan-600',
      allowedRoles: ['admin', 'warehouse'],
    },
    {
      id: 'field-service',
      name: 'Field Service',
      path: '/web/jobs',
      icon: faTools,
      color: 'bg-blue-600',
      allowedRoles: ['admin', 'technician'],
    },
    {
      id: 'helpdesk',
      name: 'Helpdesk',
      path: '/web/helpdesk',
      icon: faHeadset,
      color: 'bg-rose-600',
      allowedRoles: ['admin', 'support'],
    },
    {
      id: 'accounting',
      name: 'Accounting',
      path: '/web/accounting',
      icon: faCalculator,
      color: 'bg-slate-700',
      allowedRoles: ['admin', 'accounts'],
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/web/dashboard',
      icon: faChartPie,
      color: 'bg-violet-700',
      allowedRoles: ['admin', 'accounts'],
    },
  ];

  const visibleApps = apps.filter(
    (app) =>
      (app.allowedRoles.includes(role) || role === 'admin') &&
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectApp = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 top-11 bg-slate-900/90 backdrop-blur-md z-30 flex flex-col items-center pt-12 px-4 transition-all"
      onClick={onClose}
    >
      {/* Search Input */}
      <div
        className="w-full max-w-md mb-10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 text-sm"
        />
        <input
          type="text"
          placeholder="Search apps..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          className="w-full bg-white/10 text-white placeholder-white/50 pl-10 pr-4 py-2.5 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-odoo-accent text-sm backdrop-blur"
        />
      </div>

      {/* Apps Grid */}
      <div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-8 max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {visibleApps.map((app) => (
          <button
            key={app.id}
            onClick={() => handleSelectApp(app.path)}
            className="flex flex-col items-center group focus:outline-none"
          >
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl ${app.color} text-white flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-black/20 group-hover:scale-105 group-hover:shadow-2xl transition-all duration-200 border border-white/10`}
            >
              <FontAwesomeIcon icon={app.icon} />
            </div>
            <span className="mt-2.5 text-xs sm:text-sm font-medium text-white/90 group-hover:text-white transition-colors">
              {app.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
