import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole, getRoleHomePath } from '../../context/AuthContext';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock,
  faEnvelope,
  faUser,
  faPhone,
  faMapMarkerAlt,
  faCheck,
  faSignInAlt,
  faUserShield,
  faHeadset,
  faTools,
  faWarehouse,
  faSolarPanel,
} from '@fortawesome/free-solid-svg-icons';

export const LoginPage: React.FC = () => {
  const { login, register, switchRole } = useAuth();
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
    <div className="min-h-screen bg-white flex flex-col select-text">
      <SiteNavbar />

      <main className="flex-1 bg-slate-50/60 py-16 sm:py-20 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              Account Authentication
            </span>
            <div className="mt-2 flex justify-center">
              <ScriptHeading as="h1" align="center">
                {mode === 'login' ? 'Sign in to RoofRay' : 'Create Customer Account'}
              </ScriptHeading>
            </div>
            <p className="mt-3 text-sm text-[#6C757D]">
              {mode === 'login'
                ? 'Sign in to access your rooftop solar portal and live tracker.'
                : 'Register as a solar consumer to submit enquiries and view quotes.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-subtle border border-gray-200 p-8 sm:p-9">
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                  mode === 'login'
                    ? 'border-[#6B4B63] text-[#6B4B63]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                  mode === 'register'
                    ? 'border-[#6B4B63] text-[#6B4B63]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Register (Customer)
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. customer@roofray.com"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <FontAwesomeIcon icon={faLock} className="text-xs" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-2.5 rounded text-sm transition-colors shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded leading-relaxed">
                  Public registration creates a <strong>Customer</strong> account. Staff accounts are provisioned exclusively by administrators.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9810012345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1">
                    Installation Address
                  </label>
                  <input
                    type="text"
                    placeholder="House/Plot no., Street, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-2.5 rounded text-sm transition-colors shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Create Customer Account'}
                </button>
              </form>
            )}

            {/* 1-Click Demo Persona Switcher */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <span className="block text-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                1-Click Quick Demo Sign-in
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('customer')}
                  className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-bold text-center col-span-3 transition-colors"
                >
                  <FontAwesomeIcon icon={faSolarPanel} className="mr-1 text-emerald-600" />
                  Customer Persona (Vikram Malhotra)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('sales')}
                  className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-medium text-center transition-colors"
                >
                  <FontAwesomeIcon icon={faHeadset} className="mr-1 text-purple-600" />
                  Sales
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('technician')}
                  className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-medium text-center transition-colors"
                >
                  <FontAwesomeIcon icon={faTools} className="mr-1 text-amber-600" />
                  Technician
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('warehouse')}
                  className="py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-xs font-medium text-center transition-colors"
                >
                  <FontAwesomeIcon icon={faWarehouse} className="mr-1 text-teal-600" />
                  Warehouse
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold text-center col-span-3 transition-colors"
                >
                  <FontAwesomeIcon icon={faUserShield} className="mr-1 text-slate-700" />
                  Director & Admin (Rajesh Singhania)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
