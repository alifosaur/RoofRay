import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { HomeMenu } from './HomeMenu';

const PATH_APP_NAMES: Record<string, string> = {
  '/web/crm': 'CRM',
  '/web/surveys': 'Site Surveys',
  '/web/quotes': 'Sales & Quotes',
  '/web/orders': 'Sales Orders',
  '/web/inventory': 'Inventory & Stock',
  '/web/dispatch': 'Warehouse Dispatch',
  '/web/jobs': 'Field Service',
  '/web/helpdesk': 'Helpdesk & Warranty',
  '/web/accounting': 'Invoicing & Subsidy',
  '/web/dashboard': 'Director Dashboard',
};

export const AppLayout: React.FC = () => {
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const location = useLocation();

  // Determine active app name from pathname
  const currentApp = Object.entries(PATH_APP_NAMES).find(([prefix]) =>
    location.pathname.startsWith(prefix)
  );
  const appName = currentApp ? currentApp[1] : 'Operations';

  return (
    <div className="min-h-screen flex flex-col bg-odoo-bg">
      <Navbar
        appName={appName}
        onToggleHomeMenu={() => setIsHomeMenuOpen(!isHomeMenuOpen)}
        isHomeMenuOpen={isHomeMenuOpen}
      />
      <HomeMenu
        isOpen={isHomeMenuOpen}
        onClose={() => setIsHomeMenuOpen(false)}
      />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

