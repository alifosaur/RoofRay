import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';

const EMPTY = {
  name: '',
  description: '',
  eligibility: '',
  benefit_amounts: '',
  how_to_apply: '',
  official_link: 'https://pmsuryaghar.gov.in',
  state: 'National / All India',
  is_active: true,
  is_announcement: false,
  announcement_text: '',
  cfa_per_kw_first_2kw: 0,
  cfa_per_kw_3rd_kw: 0,
  cfa_max: 0,
  state_topup_per_kw: 0,
  grid_connected_only: true,
};

const TEXT_FIELDS: [keyof typeof EMPTY, string][] = [
  ['description', 'Description'],
  ['eligibility', 'Eligibility'],
  ['benefit_amounts', 'Benefits (shown to customers)'],
  ['how_to_apply', 'How to apply'],
];

const AMOUNT_FIELDS: [keyof typeof EMPTY, string][] = [
  ['cfa_per_kw_first_2kw', 'CFA per kW, first 2 kW (₹)'],
  ['cfa_per_kw_3rd_kw', 'CFA for the 3rd kW (₹/kW)'],
  ['cfa_max', 'Maximum CFA (₹)'],
  ['state_topup_per_kw', 'State top-up per kW (₹)'],
];

/** Admin-managed government schemes; amounts drive the estimator, packages and quotes. */
export const SchemesAdminPage: React.FC = () => {
  const [schemes, setSchemes] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .get<any[]>('/customer/schemes/all')
      .then(setSchemes)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, created_at, updated_at, ...body } = editing;
    try {
      if (id) await api.put(`/customer/schemes/${id}`, body);
      else await api.post('/customer/schemes', body);
      setEditing(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Could not save scheme');
    }
  };

  const input = 'w-full border border-gray-300 rounded px-2.5 py-1.5';
  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Admin Settings' }, { label: 'Government Schemes' }]}
        onNew={() => setEditing({ ...EMPTY })}
        newButtonLabel="New Scheme"
      />
      <div className="p-6 space-y-4 text-xs">
        <p className="text-gray-500">Amounts are used by the subsidy estimator, packages and quotations. Always confirm current values on the official portal.</p>
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
        {!schemes && !error && <div className="h-24 bg-gray-100 rounded animate-pulse" />}
        {schemes && schemes.length === 0 && (
          <div className="p-8 text-center text-gray-500 border border-dashed rounded">
            No schemes yet. Run <code>python -m app.load_catalog</code> or create one.
          </div>
        )}
        {schemes?.map((s) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded p-4 flex justify-between items-start gap-4">
            <div>
              <div className="font-bold text-sm text-gray-900">
                {s.name} {!s.is_active && <span className="text-gray-400 font-normal">(inactive)</span>}
              </div>
              <div className="text-gray-500">{s.state} · {s.grid_connected_only ? 'Grid-connected systems only' : 'All systems'}</div>
              <div className="mt-1 text-gray-700">
                ₹{s.cfa_per_kw_first_2kw.toLocaleString('en-IN')}/kW (first 2 kW) · ₹{s.cfa_per_kw_3rd_kw.toLocaleString('en-IN')}/kW (3rd kW) · max ₹
                {s.cfa_max.toLocaleString('en-IN')}
                {s.state_topup_per_kw > 0 && <> · state top-up ₹{s.state_topup_per_kw.toLocaleString('en-IN')}/kW</>}
              </div>
            </div>
            <button onClick={() => setEditing({ ...s, announcement_text: s.announcement_text || '' })} className="border border-gray-300 rounded px-3 py-1">
              Edit
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={save} className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">{editing.id ? 'Edit scheme' : 'New scheme'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label>Name<input required className={input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label>State (use "National" for central schemes)<input required className={input} value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></label>
              <label className="col-span-2">Official link<input required type="url" className={input} value={editing.official_link} onChange={(e) => setEditing({ ...editing, official_link: e.target.value })} /></label>
            </div>
            {TEXT_FIELDS.map(([k, label]) => (
              <label key={k} className="block">
                {label}
                <textarea required rows={2} className={input} value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {AMOUNT_FIELDS.map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input type="number" min="0" step="1" className={input} value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {(['is_active', 'grid_connected_only', 'is_announcement'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} />
                  {k === 'is_active' ? 'Active' : k === 'grid_connected_only' ? 'Grid-connected only' : 'Announce to customers'}
                </label>
              ))}
            </div>
            {editing.is_announcement && (
              <label className="block">Announcement text
                <input className={input} value={editing.announcement_text} onChange={(e) => setEditing({ ...editing, announcement_text: e.target.value })} />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setEditing(null)} className="border border-gray-300 rounded px-3 py-1.5">Cancel</button>
              <button className="bg-odoo-primary text-white rounded px-4 py-1.5 font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
