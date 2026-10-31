import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { validatePassword } from '../../utils/validators';

// Local auth mode: landing page for admin-issued setup links and password reset links
export const SetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) return setError(pwdCheck.message || 'Password must be at least 8 characters long');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setError(null);
    try {
      // Only sets the password; does not sign in, so an admin opening the link keeps their own session
      await api.post('/auth/set-password', { token, password });
      navigate('/login?password_set=1', { replace: true });
    } catch (err: any) {
      setError(err.message || 'This link is invalid or has expired. Ask an administrator for a new one.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm';
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNavbar />
      <main className="flex-1 bg-slate-50/60 py-16">
        <form onSubmit={submit} className="max-w-md mx-auto bg-white rounded-xl border border-gray-200 p-8 space-y-4">
          <h1 className="text-xl font-bold text-[#212529]">Set your password</h1>
          {!token && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">Missing setup token.</div>}
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">New Password (min. 8 characters)</label>
            <input className={input} type="password" minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
            <input className={input} type="password" minLength={8} placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </div>
          <button disabled={loading || !token} className="w-full py-2.5 bg-[#6B4B63] text-white font-semibold text-sm rounded disabled:opacity-60 cursor-pointer">
            {loading ? 'Saving…' : 'Set password and sign in'}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
};
