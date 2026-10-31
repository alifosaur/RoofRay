import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const CustomerPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Odoo Website-style Branded Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-odoo-purple text-white flex items-center justify-center font-bold text-lg shadow">
              <i className="fa-solid fa-solar-panel"></i>
            </div>
            <div>
              <span className="text-lg font-bold text-odoo-purple tracking-tight">SunPower Solutions</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                Customer Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-gray-800">{user?.full_name || 'Customer'}</div>
              <div className="text-[11px] text-gray-500">{user?.email}</div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-xs font-medium text-gray-600 hover:text-red-600 px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-odoo-purple to-[#8a5d7e] rounded-xl text-white p-6 sm:p-8 shadow-sm mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Welcome to your Solar Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 mb-2">
            Hello, {user?.full_name?.split(' ')[0] || 'Customer'}!
          </h1>
          <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
            Monitor your rooftop solar project from enquiry and feasibility survey to installation, commissioning, subsidy approval, and 20-year warranty tracking.
          </p>
        </div>

        {/* Quick Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-cubes-stacked"></i>
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Solar Packages</h3>
            <p className="text-xs text-gray-500 mb-4">
              Browse 1-5 kW On-Grid & Off-Grid rooftop packages with components and warranties.
            </p>
            <Link
              to="/#packages"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Explore Packages <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-teal-50 text-odoo-teal flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-route"></i>
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Installation Tracker</h3>
            <p className="text-xs text-gray-500 mb-4">
              Live status from site survey approval to warehouse dispatch and crew commissioning.
            </p>
            <span className="text-xs font-semibold text-odoo-teal flex items-center gap-1">
              Active Project <i className="fa-solid fa-circle-check text-[10px]"></i>
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-purple-50 text-odoo-purple flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Government Subsidy</h3>
            <p className="text-xs text-gray-500 mb-4">
              PM Surya Ghar: Muft Bijli Yojana subsidy claims, DISCOM approvals, and disbursements.
            </p>
            <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
              Up to ₹78,000 Subsidy <i className="fa-solid fa-info-circle text-[10px]"></i>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
