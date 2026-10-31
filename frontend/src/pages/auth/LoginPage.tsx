import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleHomePath, UserRole } from '../../context/AuthContext';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';

type Mode = 'login' | 'register' | 'forgot';

// Role descriptions only: the account's stored role decides access, never this selection
const ROLES: { role: UserRole; name: string; icon: string; description: string }[] = [
  { role: 'customer', name: 'Customer', icon: 'fa-house-chimney', description: 'Track your solar project, quotes, invoices and warranty' },
  { role: 'sales', name: 'Sales', icon: 'fa-handshake', description: 'Leads, site surveys, quotations and orders' },
  { role: 'technician', name: 'Technician', icon: 'fa-helmet-safety', description: 'Assigned surveys and installation jobs' },
  { role: 'warehouse', name: 'Warehouse', icon: 'fa-warehouse', description: 'Pick lists, serial scanning and dispatch' },
  { role: 'admin', name: 'Admin', icon: 'fa-user-shield', description: 'Users, finance, schemes and all modules' },
];

const RolePicker: React.FC<{ value: UserRole; onChange: (r: UserRole) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5" role="radiogroup" aria-label="Role">
    {ROLES.map((r) => (
      <button
        key={r.role}
        type="button"
        role="radio"
        aria-checked={value === r.role}
        onClick={() => onChange(r.role)}
        title={r.description}
        className={`p-2.5 rounded-lg border text-center transition-colors ${
          value === r.role ? 'border-[#6B4B63] bg-[#6B4B63]/5 text-[#6B4B63]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        <i className={`fa-solid ${r.icon} text-base block mb-1`}></i>
        <span className="text-xs font-semibold">{r.name}</span>
      </button>
    ))}
  </div>
);

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-[#212529] mb-1.5">{label}</span>
    {children}
  </label>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, login, logout, register, requestSignupOtp, requestPasswordReset } = useAuth();
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const signingIn = useRef(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    new URLSearchParams(window.location.search).has('password_set')
      ? 'Password set. Select your role and sign in.'
      : new URLSearchParams(window.location.search).has('denied')
      ? 'You were signed out because your role cannot open that page. Sign in with the right role.'
      : null
  );

  // Already signed in: go straight to the role's workspace
  useEffect(() => {
    // Arriving here while signed in (e.g. browser Back from a dashboard) ends the session
    if (!isLoading && user && !signingIn.current) logout();
  }, [isLoading]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      run(async () => {
        signingIn.current = true;
        const u = await login(email.trim(), password);
        if (u.role !== selectedRole) {
          await logout();
          const actual = ROLES.find((r) => r.role === u.role)?.name || u.role;
          throw new Error(`This is a ${actual} account. Select "${actual}" to sign in.`);
        }
        navigate(getRoleHomePath(u.role));
      });
    } else if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      run(async () => {
        if (!otpSent) {
          await requestSignupOtp(email.trim());
          setOtpSent(true);
          setNotice(`We emailed a 6-digit code to ${email.trim()}. Enter it below to create your account.`);
          return;
        }
        const u = await register({ email: email.trim(), password, full_name: fullName, phone, otp: otp.trim() });
        navigate(getRoleHomePath(u.role));
      });
    } else {
      run(async () => {
        await requestPasswordReset(email.trim());
        setNotice('If an account exists for this email, a password reset link has been sent.');
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      <SiteNavbar />

      <main className="flex-1 bg-slate-50/60 py-12 sm:py-16 flex flex-col justify-center">
        <div className="max-w-xl w-full mx-auto px-6">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <ScriptHeading as="h1" align="center">
                {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create a customer account' : 'Reset your password'}
              </ScriptHeading>
            </div>
            <p className="mt-3 text-sm text-[#6C757D]">
              {mode === 'register'
                ? 'Customers can register here. Staff accounts are created by an administrator.'
                : 'Choose your role and sign in to open your workspace.'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-subtle border border-gray-200 p-7 sm:p-8">
            {mode !== 'forgot' && (
              <div className="flex border-b border-gray-200 mb-6">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                      mode === m ? 'border-[#6B4B63] text-[#6B4B63]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FontAwesomeIcon icon={m === 'login' ? faSignInAlt : faUserPlus} className="text-xs" />
                    <span>{m === 'login' ? 'Sign in' : 'Register'}</span>
                  </button>
                ))}
              </div>
            )}

            {mode !== 'forgot' && (
              <>
                <span className="block text-xs font-semibold text-[#212529] mb-2">
                  {mode === 'login' ? 'Sign in as' : 'Register as'}
                </span>
                <RolePicker value={selectedRole} onChange={(r) => { setSelectedRole(r); setError(null); }} />
              </>
            )}

            {error && <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">{error}</div>}
            {notice && <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded">{notice}</div>}

            {mode === 'register' && selectedRole !== 'customer' ? (
              <div className="p-4 bg-slate-50 border border-gray-200 rounded text-xs text-[#495057] space-y-2">
                <p>
                  <strong>{ROLES.find((r) => r.role === selectedRole)?.name}</strong> accounts are created by your administrator in
                  Admin → Users. You will receive a link to set your password.
                </p>
                <button type="button" onClick={() => switchMode('login')} className="text-[#6B4B63] font-semibold hover:underline">
                  Already have an account? Sign in
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <Field label="Full name">
                    <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
                  </Field>
                  <Field label="Phone">
                    <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" type="tel" />
                  </Field>
                </>
              )}

              <Field label="Email">
                <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required type="email" autoComplete="email" />
              </Field>

              {mode === 'register' && otpSent && (
                <Field label="Verification code (from your email)">
                  <input
                    className={inputClass}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    placeholder="6-digit code"
                  />
                  <button
                    type="button"
                    onClick={() => run(async () => { await requestSignupOtp(email.trim()); setNotice('A new code has been sent.'); })}
                    className="mt-1 text-xs text-[#6B4B63] hover:underline"
                  >
                    Resend code
                  </button>
                </Field>
              )}

              {mode !== 'forgot' && (
                <Field label="Password">
                  <input
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type="password"
                    minLength={mode === 'register' ? 8 : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </Field>
              )}


              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#6B4B63] hover:bg-[#583D51] disabled:opacity-60 text-white font-semibold text-sm rounded transition-colors"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? (otpSent ? 'Verify & create account' : 'Send verification code') : 'Send reset link'}
              </button>
            </form>
            )}

            <div className="mt-5 text-center text-xs">
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')} className="text-[#6B4B63] hover:underline">
                  Forgot password?
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" onClick={() => switchMode('login')} className="text-[#6B4B63] hover:underline">
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
