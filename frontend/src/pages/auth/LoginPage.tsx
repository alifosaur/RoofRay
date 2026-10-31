import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleHomePath } from '../../context/AuthContext';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';

type Mode = 'login' | 'register' | 'forgot';

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
  const { user, login, register, requestPasswordReset } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in: go straight to the role's workspace
  useEffect(() => {
    if (user) navigate(getRoleHomePath(user.role), { replace: true });
  }, [user]);

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
        const u = await login(email.trim(), password);
        navigate(getRoleHomePath(u.role));
      });
    } else if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      run(async () => {
        const u = await register({ email: email.trim(), password, full_name: fullName, phone, address, city, pincode });
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
                ? 'Staff accounts are created by an administrator.'
                : 'You will be taken to your workspace after signing in.'}
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

            {error && <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">{error}</div>}
            {notice && <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded">{notice}</div>}

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

              {mode === 'register' && (
                <>
                  <Field label="Address">
                    <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City">
                      <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                    </Field>
                    <Field label="Postal code">
                      <input className={inputClass} value={pincode} onChange={(e) => setPincode(e.target.value)} autoComplete="postal-code" />
                    </Field>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#6B4B63] hover:bg-[#583D51] disabled:opacity-60 text-white font-semibold text-sm rounded transition-colors"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </button>
            </form>

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
