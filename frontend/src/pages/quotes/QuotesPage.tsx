import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { ListView, ColumnDef } from '../../components/odoo/ListView';

export const QuotesPage: React.FC = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [newQuote, setNewQuote] = useState({
    lead_id: Number(searchParams.get('lead_id')) || 0,
    template_id: 0,
    notes: 'Standard 20-year linear performance warranty included.',
  });

  const fetchData = async () => {
    try {
      const [qData, tData, lData] = await Promise.all([
        api.get<any[]>('/quotes'),
        api.get<any[]>('/bom-templates'),
        api.get<any[]>('/leads'),
      ]);
      setQuotes(qData);
      setTemplates(tData);
      setLeads(lData);
      if (tData.length > 0 && !newQuote.template_id) {
        setNewQuote((prev) => ({ ...prev, template_id: tData[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    if (searchParams.get('lead_id')) {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post<any>('/quotes', newQuote);
      setShowCreateModal(false);
      navigate(`/web/quotes/${created.id}`);
    } catch (err: any) {
      alert(err.message || 'Error generating quote. Ensure site survey is approved.');
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'quote_number', header: 'Quotation No.', render: (r) => <span className="font-bold text-odoo-primary">{r.quote_number}</span> },
    { key: 'customer_id', header: 'Customer', render: (r) => `Customer #${r.customer_id}` },
    { key: 'subtotal', header: 'Gross Subtotal (₹)', render: (r) => `₹${r.subtotal.toLocaleString()}` },
    { key: 'subsidy_amount', header: 'Subsidy (₹)', render: (r) => r.subsidy_amount > 0 ? <span className="text-emerald-600 font-semibold">-₹{r.subsidy_amount.toLocaleString()}</span> : '-' },
    { key: 'tax_amount', header: 'Taxes (₹)', render: (r) => `+₹${r.tax_amount.toLocaleString()}` },
    { key: 'total_amount', header: 'Net Total (₹)', render: (r) => <span className="font-bold text-gray-900">₹{r.total_amount.toLocaleString()}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${r.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-odoo-primary'}`}>
          {r.status}
        </span>
      ),
    },
    { key: 'created_at', header: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Quotations' }]}
        onNew={() => setShowCreateModal(true)}
        newButtonLabel="New Quotation"
        searchTerm={search}
        onSearchChange={setSearch}
        currentView="list"
        availableViews={['list']}
      />

      <ListView
        columns={columns}
        data={quotes.filter((q) => q.quote_number.toLowerCase().includes(search.toLowerCase()))}
        onRowClick={(r) => navigate(`/web/quotes/${r.id}`)}
      />

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl border border-odoo-border w-full max-w-md overflow-hidden text-xs">
            <div className="bg-odoo-primary text-white px-4 py-2.5 flex items-center justify-between font-semibold">
              <span>Generate Quotation with BOM Explosion</span>
              <button onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateQuote} className="p-4 space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Solar Lead *</label>
                <select
                  required
                  value={newQuote.lead_id}
                  onChange={(e) => setNewQuote({ ...newQuote, lead_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-primary focus:outline-none"
                >
                  <option value={0}>-- Select Approved Lead --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.phone}) - {l.required_capacity} kW [{l.status}]
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 block mt-1">
                  Note: The site survey must be APPROVED to generate quotation.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select BOM Package Template *</label>
                <select
                  required
                  value={newQuote.template_id}
                  onChange={(e) => setNewQuote({ ...newQuote, template_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-primary focus:outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.capacity_kw} kW {t.system_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Quotation Notes</label>
                <textarea
                  rows={2}
                  value={newQuote.notes}
                  onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-medium shadow-sm"
                >
                  Explode BOM & Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

