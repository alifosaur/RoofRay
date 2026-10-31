import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole, DEMO_TOKENS, getRoleHomePath } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register, switchRole, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Delhi NCR');
  const [pincode, setPincode] = useState('110001');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await login(email, password);
      navigate(getRoleHomePath(loggedUser.role));
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !phone) {
      setError('Please fill in your name, email and phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newUser = await register({
        email,
        full_name: fullName,
        phone,
        password: password || 'customer123',
        address: address || 'Delhi NCR',
        city,
        pincode,
      });
      navigate(getRoleHomePath(newUser.role)); // Redirects to /customer
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (roleKey: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await switchRole(roleKey);
      navigate(getRoleHomePath(roleKey));
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-odoo-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-lg bg-odoo-purple text-white flex items-center justify-center font-bold text-xl shadow-md">
            <i className="fa-solid fa-solar-panel"></i>
          </div>
          <span className="text-2xl font-bold text-odoo-purple tracking-tight">SunPower ERP</span>
        </div>
        <h2 className="text-sm font-medium text-gray-600">
          Rooftop Solar Installation & Management System
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-lg sm:px-10">
          {/* Tabs: Sign In vs Customer Registration */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-odoo-purple text-odoo-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fa-solid fa-right-to-bracket mr-2"></i>Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                mode === 'register'
                  ? 'border-odoo-purple text-odoo-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fa-solid fa-user-plus mr-2"></i>Register (Customer)
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-500"></i>
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <i className="fa-solid fa-envelope text-xs"></i>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@sunpower.com or customer@sunpower.com"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <i className="fa-solid fa-lock text-xs"></i>
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-odoo-purple hover:bg-odoo-purple-hover text-white text-sm font-medium rounded shadow transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded mb-2 leading-relaxed">
                <i className="fa-solid fa-circle-info mr-1 text-blue-600"></i>
                Self-registration is available for <strong>Customers</strong>. Staff accounts are provisioned exclusively by administrators.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  required
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    required
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9810012345"
                    required
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Installation Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Plot no., Street, Area"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City / State</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-odoo-teal hover:bg-teal-700 text-white text-sm font-medium rounded shadow transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Registering account...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Create Customer Account
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Persona Switcher */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <span className="block text-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              1-Click Demo Personas
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-xs font-medium text-center"
              >
                <i className="fa-solid fa-user-shield block text-sm mb-0.5"></i>
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sales')}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-medium text-center"
              >
                <i className="fa-solid fa-headset block text-sm mb-0.5"></i>
                Sales
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('technician')}
                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-medium text-center"
              >
                <i className="fa-solid fa-screwdriver-wrench block text-sm mb-0.5"></i>
                Technician
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('warehouse')}
                className="py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded text-xs font-medium text-center"
              >
                <i className="fa-solid fa-boxes-stacked block text-sm mb-0.5"></i>
                Warehouse
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('customer')}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-medium text-center col-span-2"
              >
                <i className="fa-solid fa-house-chimney-window block text-sm mb-0.5"></i>
                Customer Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

