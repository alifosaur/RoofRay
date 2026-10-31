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
} from '@fortawesome/free-solid-svg-icons';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
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
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
