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
  faPhone,
  faSignInAlt,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';

interface RoleMeta {
  role: UserRole;
  name: string;
  badge: string;
  iconEmoji: string;
  defaultEmail: string;
  defaultPass: string;
  path: string;
  description: string;
}

const ROLES_CATALOG: RoleMeta[] = [
  {
    role: 'customer',
    name: 'Customer',
    badge: 'Solar Consumer',
    iconEmoji: '👤',
    defaultEmail: 'customer@roofray.com',
    defaultPass: 'customer123',
    path: '/customer',
    description: 'Rooftop portal: request consultation call, review quotes & track 13-stage order progress.',
  },
  {
    role: 'sales',
    name: 'Sales Officer',
    badge: 'CRM & Quotes',
    iconEmoji: '💼',
    defaultEmail: 'sales@roofray.com',
    defaultPass: 'sales123',
    path: '/sales',
    description: 'CRM workspace: call checklist, survey scheduling, quotation builder & submit to warehouse.',
  },
  {
    role: 'technician',
    name: 'Field Technician',
    badge: 'Mobile PWA',
    iconEmoji: '🔧',
    defaultEmail: 'tech@roofray.com',
    defaultPass: 'tech123',
    path: '/technician',
    description: 'Field tasks: mobile roof surveys, shadow-free measurements, and solar installation jobs.',
  },
  {
    role: 'warehouse',
    name: 'Warehouse Manager',
    badge: 'Inventory & Barcode',
    iconEmoji: '📦',
    defaultEmail: 'warehouse@roofray.com',
    defaultPass: 'warehouse123',
    path: '/warehouse',
    description: 'Inventory hub: pick lists from confirmed orders, barcode serial scanner, and dispatches.',
  },
  {
    role: 'admin',
    name: 'Administrator',
    badge: 'Operations & ERP',
    iconEmoji: '🛡️',
    defaultEmail: 'admin@roofray.com',
    defaultPass: 'admin123',
    path: '/admin',
    description: 'Full ERP management: team users, DISCOM government subsidies, and financial metrics.',
  },
];

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Selected roles for login and registration
  const [selectedLoginRole, setSelectedLoginRole] = useState<UserRole>('customer');
  const [selectedRegisterRole, setSelectedRegisterRole] = useState<UserRole>('customer');

  // Form fields
  const [email, setEmail] = useState('customer@roofray.com');
  const [password, setPassword] = useState('customer123');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Delhi NCR');
  const [pincode, setPincode] = useState('110001');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When changing login role, update prefilled credentials
  const handleSelectLoginRole = (meta: RoleMeta) => {
    setSelectedLoginRole(meta.role);
    setEmail(meta.defaultEmail);
    setPassword(meta.defaultPass);
    setError(null);
  };

  const handleSelectRegisterRole = (meta: RoleMeta) => {
    setSelectedRegisterRole(meta.role);
    setError(null);
  };

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
      setError('Please fill in your full name, email and phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newUser = await register({
        email,
        full_name: fullName,
        phone,
        role: selectedRegisterRole,
        password: password || 'demo123',
        department: selectedRegisterRole !== 'customer' ? department : undefined,
        address: selectedRegisterRole === 'customer' ? (address || 'Delhi NCR') : undefined,
        city: selectedRegisterRole === 'customer' ? city : undefined,
        pincode: selectedRegisterRole === 'customer' ? pincode : undefined,
      });
      navigate(getRoleHomePath(newUser.role));
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentLoginMeta = ROLES_CATALOG.find((r) => r.role === selectedLoginRole) || ROLES_CATALOG[0];
  const currentRegisterMeta = ROLES_CATALOG.find((r) => r.role === selectedRegisterRole) || ROLES_CATALOG[0];

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      <SiteNavbar />

      <main className="flex-1 bg-slate-50/60 py-12 sm:py-16 flex flex-col justify-center">
        <div className="max-w-xl w-full mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              Role-Based Authentication
            </span>
            <div className="mt-2 flex justify-center">
              <ScriptHeading as="h1" align="center">
                {mode === 'login' ? 'Sign in to RoofRay' : 'Create an Account'}
              </ScriptHeading>
            </div>
            <p className="mt-3 text-sm text-[#6C757D]">
              {mode === 'login'
                ? 'Select your role or enter credentials to access your designated workspace.'
                : 'Select the role you wish to register with to get started.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-subtle border border-gray-200 p-7 sm:p-8">
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  mode === 'login'
                    ? 'border-[#6B4B63] text-[#6B4B63]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={faSignInAlt} className="text-xs" />
                <span>Sign In (Role Selection)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  mode === 'register'
                    ? 'border-[#6B4B63] text-[#6B4B63]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
                <span>Register by Role</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {error}
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 1: SIGN IN WITH ROLE SELECTOR */}
            {/* ============================================================== */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {/* 1. Interactive Role Selector */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-[#212529] uppercase tracking-wider">
                      Select Role to Sign In:
                    </label>
                    <span className="text-[11px] text-[#6B4B63] font-medium">5 Active Roles</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROLES_CATALOG.map((meta) => {
                      const isSelected = selectedLoginRole === meta.role;
                      return (
                        <button
                          key={meta.role}
                          type="button"
                          onClick={() => handleSelectLoginRole(meta)}
                          className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isSelected
                              ? 'border-[#6B4B63] bg-purple-50/50 ring-2 ring-[#6B4B63]/25 shadow-xs'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base">{meta.iconEmoji}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-[#6B4B63] text-white flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={`font-bold text-xs ${isSelected ? 'text-[#6B4B63]' : 'text-gray-900'}`}>
                              {meta.name}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate mt-0.5">
                              {meta.badge}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Role Destination Banner */}
                <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-xs text-[#6B4B63] flex items-start gap-2.5">
                  <span className="text-base">{currentLoginMeta.iconEmoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span>{currentLoginMeta.name}</span>
                      <span className="text-[10px] bg-white border border-purple-200 px-1.5 py-0.2 rounded font-mono text-[#6B4B63]">
                        {currentLoginMeta.path}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {currentLoginMeta.description}
                    </div>
                  </div>
                </div>

                {/* Credentials Inputs */}
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
                      placeholder="e.g. sales@roofray.com"
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
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-3 rounded text-sm transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="text-xs" />
                  <span>
                    {loading ? 'Authenticating...' : `Sign In as ${currentLoginMeta.name}`}
                  </span>
                </button>
              </form>
            ) : (
              /* ============================================================== */
              /* MODE 2: REGISTER WITH ROLE SELECTION */
              /* ============================================================== */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* 1. Interactive Role Selector for Registration */}
                <div>
                  <label className="block text-xs font-bold text-[#212529] mb-2 uppercase tracking-wider">
                    Select Account Role:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROLES_CATALOG.map((meta) => {
                      const isSelected = selectedRegisterRole === meta.role;
                      return (
                        <button
                          key={meta.role}
                          type="button"
                          onClick={() => handleSelectRegisterRole(meta)}
                          className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isSelected
                              ? 'border-[#6B4B63] bg-purple-50/50 ring-2 ring-[#6B4B63]/25 shadow-xs'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base">{meta.iconEmoji}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-[#6B4B63] text-white flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={`font-bold text-xs ${isSelected ? 'text-[#6B4B63]' : 'text-gray-900'}`}>
                              {meta.name}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate mt-0.5">
                              {meta.badge}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Role Description Notice */}
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded leading-relaxed flex items-start gap-2">
                  <span className="text-base">{currentRegisterMeta.iconEmoji}</span>
                  <div>
                    Registering as <strong>{currentRegisterMeta.name}</strong> ({currentRegisterMeta.badge}).{' '}
                    {currentRegisterMeta.description} Directs to <code className="bg-white px-1 py-0.2 rounded font-mono font-bold text-teal-900">{currentRegisterMeta.path}</code>.
                  </div>
                </div>

                {/* Full Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={selectedRegisterRole === 'customer' ? 'e.g. Ramesh Chandra' : 'e.g. Rajesh Kumar'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <FontAwesomeIcon icon={faPhone} className="text-xs" />
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="9810012345"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Email & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={selectedRegisterRole === 'customer' ? 'ramesh@email.com' : `${selectedRegisterRole}@roofray.com`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                </div>

                {/* Contextual Fields depending on Role */}
                {selectedRegisterRole === 'customer' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1">
                        Installation Rooftop Address
                      </label>
                      <input
                        type="text"
                        placeholder="House/Plot no., Street, Sector"
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
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1">
                      Staff Department / Specialization
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Regional Field Operations / Commercial Sales"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-3 rounded text-sm transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
                  <span>
                    {loading ? 'Creating account...' : `Create ${currentRegisterMeta.name} Account`}
                  </span>
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
