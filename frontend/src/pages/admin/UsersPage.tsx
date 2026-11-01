import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { validateEmail, validatePassword, validatePhone, sanitizePhone } from '../../utils/validators';
import {
  faUserShield,
  faPlus,
  faUserCheck,
  faUserSlash,
  faEdit,
  faSearch,
  faHardHat,
  faBriefcase,
  faWarehouse,
  faUserTie,
  faUser,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';

interface UserItem {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'sales' | 'technician' | 'warehouse' | 'customer';
  phone?: string | null;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
}

const STAFF_ROLES = [
  { role: 'sales', label: 'Sales Officer', icon: 'fa-handshake' },
  { role: 'technician', label: 'Technician', icon: 'fa-helmet-safety' },
  { role: 'warehouse', label: 'Warehouse Staff', icon: 'fa-warehouse' },
];

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'sales',
    phone: '',
    hourly_rate: 0,
    password: '',
  });
  const openCreate = (role: string) => {
    setNewUser({ email: '', full_name: '', role, phone: '', hourly_rate: 0, password: '' });
    setShowCreateModal(true);
  };
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = roleFilter === 'all' ? '/users' : `/users?role=${roleFilter.toLowerCase()}`;
      const data = await api.get<UserItem[]>(url);
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Email validation (must have @ and .)
    const emailCheck = validateEmail(newUser.email);
    if (!emailCheck.isValid) {
      alert(emailCheck.message || "Email must contain '@' and '.' (e.g., name@domain.com).");
      return;
    }

    // 2. Phone validation if filled (10 digits)
    if (newUser.phone) {
      const phoneCheck = validatePhone(newUser.phone);
      if (!phoneCheck.isValid) {
        alert(phoneCheck.message || 'Phone number must be exactly 10 digits.');
        return;
      }
    }

    // 3. Password validation if set (min 8 chars)
    if (newUser.password) {
      const pwdCheck = validatePassword(newUser.password);
      if (!pwdCheck.isValid) {
        alert(pwdCheck.message || 'Password must be at least 8 characters long.');
        return;
      }
    }

    try {
      const res = await api.post<any>('/users', {
        ...newUser,
        phone: newUser.phone ? sanitizePhone(newUser.phone) : undefined,
        role: newUser.role.toLowerCase(),
        hourly_rate: Number(newUser.hourly_rate),
        password: newUser.password || undefined,
        is_active: true,
      });
      if (newUser.password) {
        alert(`${newUser.full_name} created. They can sign in now with ${newUser.email} and the password you set.`);
      } else {
        // The setup link is also emailed to the staff member (SMTP)
        setSetupLink(`${window.location.origin}${res.password_setup_url}`);
      }
      setShowCreateModal(false);
      setNewUser({ email: '', full_name: '', role: 'sales', phone: '', hourly_rate: 0, password: '' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleSetPassword = async (u: UserItem) => {
    const pwd = window.prompt(`New password for ${u.full_name} (${u.email}), at least 8 characters:`);
    if (pwd === null) return;
    if (pwd.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    try {
      await api.post(`/users/${u.id}/password`, { password: pwd });
      alert(`Password updated. ${u.full_name} can now sign in with ${u.email}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to set password');
    }
  };

  const handleRemove = async (u: UserItem) => {
    if (!window.confirm(`Remove ${u.full_name} (${u.email})?\n\nIf they already have work history (leads, surveys, jobs, payments), the account is deactivated instead so those records stay intact.`)) return;
    try {
      const res = await api.delete<any>(`/users/${u.id}`);
      alert(res.message);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove user');
    }
  };

  const handleToggleActive = async (u: UserItem) => {
    const action = u.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${u.full_name}?`)) return;
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} user`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (selectedUser.phone) {
      const phoneCheck = validatePhone(selectedUser.phone);
      if (!phoneCheck.isValid) {
        alert(phoneCheck.message || 'Phone number must be exactly 10 digits.');
        return;
      }
    }
    try {
      await api.put(`/users/${selectedUser.id}`, {
        full_name: selectedUser.full_name,
        role: selectedUser.role.toLowerCase(),
        phone: selectedUser.phone ? sanitizePhone(selectedUser.phone) : undefined,
        hourly_rate: Number(selectedUser.hourly_rate),
      });
      alert('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const roleIcons: Record<string, any> = {
    admin: faUserShield,
    sales: faBriefcase,
    technician: faHardHat,
    warehouse: faWarehouse,
    customer: faUser,
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-800 border-rose-200',
    sales: 'bg-purple-100 text-purple-800 border-purple-200',
    technician: 'bg-amber-100 text-amber-800 border-amber-200',
    warehouse: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    customer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col font-sans">
      <ControlPanel
        breadcrumbs={[{ label: 'Admin Settings' }, { label: 'User & Staff Management' }]}
        onNew={() => openCreate('sales')}
        newButtonLabel="Create Staff User"
        searchTerm={search}
        onSearchChange={setSearch}
      />

      {/* Quick add: one button per staff role, opens the form with the role preset */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-gray-600 mr-1">Add staff:</span>
        {STAFF_ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => openCreate(r.role)}
            className="px-3 py-1.5 rounded bg-odoo-primary hover:bg-odoo-primary-dark text-white font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <i className={`fa-solid ${r.icon}`}></i>
            <span>Add {r.label}</span>
          </button>
        ))}
      </div>

      {setupLink && (
        <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
          <div className="font-bold mb-1">
            Staff account created and the link was emailed to them. This is a LINK, not a password: the staff member must open it in their browser and choose a password there (valid 48 hours).
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all bg-white border border-emerald-200 rounded px-2 py-1">{setupLink}</code>
            <button onClick={() => navigator.clipboard.writeText(setupLink)} className="px-2 py-1 bg-emerald-700 text-white rounded">Copy link</button>
            <a href={setupLink} target="_blank" rel="noreferrer" className="px-2 py-1 border border-emerald-300 rounded">Open</a>
            <button onClick={() => setSetupLink(null)} className="px-2 py-1 border border-emerald-300 rounded">Dismiss</button>
          </div>
        </div>
      )}

      {/* Role Filter Pills */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-gray-400 font-semibold uppercase text-[10px] mr-2">Filter Role:</span>
        {['all', 'admin', 'sales', 'technician', 'warehouse', 'customer'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] transition-colors ${
              roleFilter === r
                ? 'bg-odoo-primary text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="flex-1 p-6 bg-odoo-bg overflow-y-auto">
        <div className="bg-white rounded border border-odoo-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-odoo-border text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Rate / Commission</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">Loading users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const rKey = (u.role || 'customer').toLowerCase();
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{u.full_name}</div>
                          <div className="text-[10px] text-gray-400">ID #{u.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1.5 w-max ${roleColors[rKey] || 'bg-gray-100'}`}>
                            <FontAwesomeIcon icon={roleIcons[rKey] || faUser} className="text-[9px]" />
                            <span className="uppercase">{u.role}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">{u.email}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{u.phone || '—'}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {rKey === 'technician' ? (
                            <span className="font-bold text-gray-800">₹{u.hourly_rate || 600} / hr</span>
                          ) : rKey === 'sales' ? (
                            <span className="text-emerald-700 font-semibold">2.5% Commission</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setShowEditModal(true);
                              }}
                              className="px-2 py-1 text-gray-600 hover:text-odoo-primary border border-gray-200 rounded hover:bg-gray-50"
                              title="Edit user details"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            {u.role !== 'customer' && (
                              <button
                                onClick={() => handleSetPassword(u)}
                                className="px-2 py-1 text-gray-600 hover:text-odoo-primary border border-gray-200 rounded hover:bg-gray-50 text-[11px]"
                                title="Set a new password"
                              >
                                <i className="fa-solid fa-key"></i>
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-2 py-1 border rounded text-[11px] ${
                                u.is_active
                                  ? 'text-red-600 hover:bg-red-50 border-red-200'
                                  : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                              }`}
                              title={u.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              <FontAwesomeIcon icon={u.is_active ? faUserSlash : faUserCheck} />
                            </button>
                            {u.role !== 'customer' && (
                              <button
                                onClick={() => handleRemove(u)}
                                className="px-2 py-1 border border-red-200 rounded text-[11px] text-red-600 hover:bg-red-50"
                                title="Remove user"
                                aria-label={`Remove ${u.full_name}`}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-odoo-border w-full max-w-md overflow-hidden">
            <div className="bg-odoo-primary text-white px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>Create Staff Account</span>
              <button onClick={() => setShowCreateModal(false)} className="hover:text-white/80 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Full name"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-odoo-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Staff Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 font-bold"
                  >
                    <option value="sales">Sales Officer</option>
                    <option value="technician">Field Technician</option>
                    <option value="warehouse">Warehouse Specialist</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phone Number (10 digits)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    inputMode="numeric"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: sanitizePhone(e.target.value) })}
                    placeholder="10-digit number"
                    className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="name@domain.com"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Initial password (at least 8 chars)</label>
                <div className="relative">
                  <input
                    type={showNewUserPassword ? 'text' : 'password'}
                    minLength={8}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="At least 8 characters (leave blank to send a setup link instead)"
                    className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer transition-colors"
                    title={showNewUserPassword ? 'Hide password' : 'Show password'}
                    aria-label={showNewUserPassword ? 'Hide password' : 'Show password'}
                  >
                    <FontAwesomeIcon icon={showNewUserPassword ? faEyeSlash : faEye} className="text-sm" />
                  </button>
                </div>
                <span className="text-[10px] text-gray-400">Share it with the staff member; they sign in with their email and this password.</span>
              </div>

              {newUser.role === 'technician' && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Hourly Payout Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={newUser.hourly_rate}
                    onChange={(e) => setNewUser({ ...newUser, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded px-3 py-2 font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-bold shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-odoo-border w-full max-w-md overflow-hidden">
            <div className="bg-odoo-primary text-white px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>Edit Staff Details: {selectedUser.full_name}</span>
              <button onClick={() => setShowEditModal(false)} className="hover:text-white/80 text-sm">✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={selectedUser.full_name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Role</label>
                  <select
                    value={selectedUser.role.toLowerCase()}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-3 py-2 font-bold"
                  >
                    <option value="sales">Sales</option>
                    <option value="technician">Technician</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="admin">Admin</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phone Number (10 digits)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    inputMode="numeric"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: sanitizePhone(e.target.value) })}
                    placeholder="10-digit number"
                    className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {selectedUser.role.toLowerCase() === 'technician' && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Hourly Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={selectedUser.hourly_rate || 600}
                    onChange={(e) => setSelectedUser({ ...selectedUser, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded px-3 py-2 font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
