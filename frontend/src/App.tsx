import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/odoo/AppLayout';

// Pages
import { PublicWebsitePage } from './pages/public/PublicWebsitePage';
import { CRMPage } from './pages/crm/CRMPage';
import { LeadFormPage } from './pages/crm/LeadFormPage';
import { SurveysPage } from './pages/surveys/SurveysPage';
import { QuotesPage } from './pages/quotes/QuotesPage';
import { QuoteFormPage } from './pages/quotes/QuoteFormPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { OrderFormPage } from './pages/orders/OrderFormPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { DispatchPage } from './pages/dispatch/DispatchPage';
import { JobsPage } from './pages/jobs/JobsPage';
import { TechnicianPWAPage } from './pages/pwa/TechnicianPWAPage';
import { HelpdeskPage } from './pages/helpdesk/HelpdeskPage';
import { AccountingPage } from './pages/accounting/AccountingPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public customer-facing website */}
          <Route path="/" element={<PublicWebsitePage />} />

          {/* Technician Mobile PWA */}
          <Route path="/pwa/tech" element={<TechnicianPWAPage />} />

          {/* Shared read-only director dashboard */}
          <Route path="/shared/dashboard" element={<DashboardPage />} />

          {/* Odoo Backend Staff App */}
          <Route path="/web" element={<AppLayout />}>
            <Route index element={<Navigate to="/web/crm" replace />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="crm/:id" element={<LeadFormPage />} />
            <Route path="surveys" element={<SurveysPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="quotes/:id" element={<QuoteFormPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderFormPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="dispatch" element={<DispatchPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="helpdesk" element={<HelpdeskPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
