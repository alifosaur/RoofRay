import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LiveEventsProvider } from './live/LiveEvents';
import { RoleRouteGuard } from './routes/RoleRouteGuard';
import { AppLayout } from './components/odoo/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SetPasswordPage } from './pages/auth/SetPasswordPage';
import { Forbidden403Page } from './pages/auth/Forbidden403Page';
import { PublicWebsitePage } from './pages/public/PublicWebsitePage';
import { PackagesPage } from './pages/public/PackagesPage';
import { GovtSchemesPage } from './pages/public/GovtSchemesPage';
import { HelpPage } from './pages/public/HelpPage';
import { CustomerPortalPage } from './pages/customer/CustomerPortalPage';
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
import { UsersPage } from './pages/admin/UsersPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LiveEventsProvider>
        <Routes>
          {/* Public customer-facing website & portal pages */}
          <Route path="/" element={<PublicWebsitePage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/schemes" element={<GovtSchemesPage />} />
          <Route path="/help" element={<HelpPage />} />

          {/* Unified Login & Customer Self-Registration Page */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/403" element={<Forbidden403Page />} />

          {/* Customer Portal (/customer) */}
          <Route
            path="/customer"
            element={
              <RoleRouteGuard allowedRoles={['customer']}>
                <CustomerPortalPage />
              </RoleRouteGuard>
            }
          />

          {/* Role Direct Redirections */}
          <Route
            path="/sales"
            element={
              <RoleRouteGuard allowedRoles={['sales']}>
                <Navigate to="/web/crm" replace />
              </RoleRouteGuard>
            }
          />

          <Route
            path="/warehouse"
            element={
              <RoleRouteGuard allowedRoles={['warehouse']}>
                <Navigate to="/web/dispatch" replace />
              </RoleRouteGuard>
            }
          />

          <Route
            path="/admin"
            element={
              <RoleRouteGuard allowedRoles={['admin']}>
                <Navigate to="/web/dashboard" replace />
              </RoleRouteGuard>
            }
          />

          {/* Technician Mobile-First PWA (/technician and /pwa/tech) */}
          <Route
            path="/technician"
            element={
              <RoleRouteGuard allowedRoles={['technician']}>
                <TechnicianPWAPage />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/pwa/tech"
            element={
              <RoleRouteGuard allowedRoles={['technician']}>
                <TechnicianPWAPage />
              </RoleRouteGuard>
            }
          />

          {/* Shared read-only director dashboard */}
          <Route path="/shared/dashboard" element={<DashboardPage />} />

          {/* Odoo Staff App Shell (/web) - Staff roles only */}
          <Route
            path="/web"
            element={
              <RoleRouteGuard allowedRoles={['sales', 'warehouse', 'admin']}>
                <AppLayout />
              </RoleRouteGuard>
            }
          >
            <Route index element={<Navigate to="/web/crm" replace />} />

            {/* Sales & Admin accessible routes */}
            <Route
              path="crm"
              element={
                <RoleRouteGuard allowedRoles={['sales', 'admin']}>
                  <CRMPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="crm/:id"
              element={
                <RoleRouteGuard allowedRoles={['sales', 'admin']}>
                  <LeadFormPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="surveys"
              element={
                <RoleRouteGuard allowedRoles={['sales', 'admin']}>
                  <SurveysPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="quotes"
              element={
                <RoleRouteGuard allowedRoles={['sales', 'admin']}>
                  <QuotesPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="quotes/:id"
              element={
                <RoleRouteGuard allowedRoles={['sales', 'admin']}>
                  <QuoteFormPage />
                </RoleRouteGuard>
              }
            />

            {/* Orders - accessible to sales, warehouse, admin */}
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderFormPage />} />

            {/* Warehouse & Admin accessible routes */}
            <Route
              path="inventory"
              element={
                <RoleRouteGuard allowedRoles={['warehouse', 'admin']}>
                  <InventoryPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="dispatch"
              element={
                <RoleRouteGuard allowedRoles={['warehouse', 'admin']}>
                  <DispatchPage />
                </RoleRouteGuard>
              }
            />

            {/* Field Service / Jobs */}
            <Route
              path="jobs"
              element={
                <RoleRouteGuard allowedRoles={['admin', 'sales']}>
                  <JobsPage />
                </RoleRouteGuard>
              }
            />

            {/* Helpdesk */}
            <Route
              path="helpdesk"
              element={
                <RoleRouteGuard allowedRoles={['sales', 'admin']}>
                  <HelpdeskPage />
                </RoleRouteGuard>
              }
            />

            {/* Accounting & Executive Dashboard - Admin only */}
            <Route
              path="accounting"
              element={
                <RoleRouteGuard allowedRoles={['admin']}>
                  <AccountingPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="users"
              element={
                <RoleRouteGuard allowedRoles={['admin']}>
                  <UsersPage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="dashboard"
              element={
                <RoleRouteGuard allowedRoles={['admin']}>
                  <DashboardPage />
                </RoleRouteGuard>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LiveEventsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
