import React, { useState, useEffect } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ControlPanel, ViewType } from '../../components/odoo/ControlPanel';
import { KanbanView, KanbanColumn, KanbanItem } from '../../components/odoo/KanbanView';
import { ListView, ColumnDef } from '../../components/odoo/ListView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDolly, faCheckCircle, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';

export const CRMPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [view, setView] = useState<ViewType>('kanban');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    required_capacity: 3.0,
    system_type: 'On-Grid',
  });
  const navigate = useNavigate();

  const [salesMetrics, setSalesMetrics] = useState<any>(null);

  const fetchLeads = async () => {
    try {
      const data = await api.get<any[]>('/leads');
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['lead.', 'survey.', 'quote.', 'order.'], () => { fetchLeads(); fetchSalesMetrics(); });

  const fetchSalesMetrics = async () => {
    try {
      const data = await api.get<any>('/reports/sales-metrics');
      setSalesMetrics(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchSalesMetrics();
  }, []);

  const columns: KanbanColumn[] = [
    { id: 'NEW', title: 'New', color: 'bg-blue-500' },
    { id: 'CONTACTED', title: 'Contacted', color: 'bg-indigo-500' },
    { id: 'QUALIFIED', title: 'Qualified', color: 'bg-teal-500' },
    { id: 'SURVEY_SCHEDULED', title: 'Survey Scheduled', color: 'bg-amber-500' },
    { id: 'SURVEY_APPROVED', title: 'Survey Approved', color: 'bg-emerald-500' },
    { id: 'QUOTED', title: 'Quoted', color: 'bg-purple-500' },
    { id: 'WON', title: 'Won', color: 'bg-green-600' },
    { id: 'LOST', title: 'Lost', color: 'bg-red-500' },
  ];

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.address && l.address.toLowerCase().includes(search.toLowerCase()))
  );

  const kanbanItems: KanbanItem[] = filteredLeads.map((l) => ({
    id: l.id,
    columnId: l.status,
    title: l.name,
    subtitle: `${l.phone} • ${l.address}`,
    tags: [
      { label: `${l.required_capacity} kW`, color: 'bg-purple-100 text-odoo-primary' },
      { label: l.system_type, color: 'bg-teal-100 text-odoo-accent' },
    ],
    amount: l.quotes && l.quotes.length > 0 ? l.quotes[0].total_amount : undefined,
    priority: l.required_capacity >= 5.0,
    meta:
      l.status === 'SURVEY_APPROVED' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/web/crm/${l.id}?action=send_to_warehouse`);
          }}
          className="w-full bg-[#6B4B63] hover:bg-[#583D51] text-white font-semibold py-1 px-2 rounded text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          title="Send required pre-engineered item details to warehouse"
        >
          <FontAwesomeIcon icon={faDolly} />
          <span>Send Items to Warehouse</span>
        </button>
      ) : l.status === 'SURVEY_SCHEDULED' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/web/crm/${l.id}`);
          }}
          className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium py-0.5 px-2 rounded text-[10px] flex items-center justify-center gap-1 transition-colors"
        >
          <FontAwesomeIcon icon={faCalendarCheck} className="text-amber-600" />
          <span>Survey Scheduled (Verify)</span>
        </button>
      ) : undefined,
  }));

  const listColumns: ColumnDef<any>[] = [
    { key: 'name', header: 'Lead Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'required_capacity', header: 'Capacity (kW)', render: (r) => `${r.required_capacity} kW` },
    { key: 'system_type', header: 'System Type' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800">
          {r.status}
        </span>
      ),
    },
    { key: 'created_at', header: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leads/public', newLead);
      setShowCreateModal(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        address: '',
        required_capacity: 3.0,
        system_type: 'On-Grid',
      });
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Error creating lead');
    }
  };

  const handleMove = async (itemId: string | number, newStatus: string) => {
    try {
      await api.put(`/leads/${itemId}`, { status: newStatus });
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'CRM Leads' }]}
        onNew={() => setShowCreateModal(true)}
        newButtonLabel="New Lead"
        searchTerm={search}
        onSearchChange={setSearch}
        currentView={view}
        onViewChange={setView}
        availableViews={['kanban', 'list', 'graph']}
      />

      {/* Salesman Directive Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-purple-50/50 to-white border-b border-purple-200/80 px-6 py-2.5 flex items-center justify-between text-xs text-[#6B4B63]">
        <div className="flex items-center gap-2.5">
          <span className="font-bold bg-[#6B4B63] text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
            Sales Directive
          </span>
          <span className="font-medium text-[#212529]">
            Clients book consultation calls online. Conduct the requirements call, <strong>create quotation according to the client</strong>, and <strong>submit it to warehouse</strong> for pick list & dispatch.
          </span>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView
          columns={columns}
          items={kanbanItems}
          onItemClick={(item) => navigate(`/web/crm/${item.id}`)}
          onMoveItem={handleMove}
        />
      ) : view === 'list' ? (
        <ListView
          columns={listColumns}
          data={filteredLeads}
          onRowClick={(row) => navigate(`/web/crm/${row.id}`)}
        />
      ) : (
        /* Sales Dashboard & Commission Tracker View */
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-odoo-bg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded border border-odoo-border shadow-xs">
              <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block">Conversion Rate</span>
              <div className="text-2xl font-bold text-odoo-primary mt-1">
                {salesMetrics?.conversion_rate_pct ?? 0}%
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Won vs Closed Leads</span>
            </div>

            <div className="bg-white p-4 rounded border border-odoo-border shadow-xs">
              <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block">Active Pipeline Value</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ₹{(salesMetrics?.pipeline_value || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{salesMetrics?.active_pipeline_count || 0} active leads in pipeline</span>
            </div>

            <div className="bg-white p-4 rounded border border-odoo-border shadow-xs">
              <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block">Average Deal Size</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ₹{(salesMetrics?.average_deal_size || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-400 font-medium">Across won solar projects</span>
            </div>

            <div className="bg-white p-4 rounded border border-emerald-200 bg-emerald-50/30 shadow-xs">
              <span className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider block">Commission Earned (2.5%)</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{(salesMetrics?.commission_earned || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Total earned on confirmed deals</span>
            </div>
          </div>

          {/* Won Deals & Commissions Table */}
          <div className="bg-white rounded border border-odoo-border shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-odoo-border bg-gray-50/70 flex justify-between items-center text-xs">
              <h3 className="font-bold text-gray-900 uppercase tracking-wider">Commission Breakdown by Closed Deal</h3>
              <span className="text-[11px] text-gray-500">Fixed 2.5% Success Fee</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 border-b border-odoo-border">
                  <tr>
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Capacity & Type</th>
                    <th className="py-2.5 px-3 text-right">Deal Value</th>
                    <th className="py-2.5 px-3 text-center">Rate</th>
                    <th className="py-2.5 px-3 text-right">Commission Earned</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {salesMetrics?.deals && salesMetrics.deals.length > 0 ? (
                    salesMetrics.deals.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-3 font-mono font-semibold text-odoo-primary">{d.order_number}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{d.customer_name}</td>
                        <td className="py-2.5 px-3">{d.capacity_kw} kW {d.system_type}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">₹{d.deal_value.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{d.commission_rate}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">₹{d.commission_amount.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400">
                        No closed sales orders with commission yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl border border-odoo-border w-full max-w-md overflow-hidden">
            <div className="bg-odoo-primary text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold">
              <span>Create Solar Lead</span>
              <button onClick={() => setShowCreateModal(false)} className="hover:text-white/80 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="ramesh@example.com"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Installation Address *</label>
                <textarea
                  required
                  rows={2}
                  value={newLead.address}
                  onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                  placeholder="House No, Sector, City"
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Capacity (kW) *</label>
                  <select
                    value={newLead.required_capacity}
                    onChange={(e) => setNewLead({ ...newLead, required_capacity: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-primary focus:outline-none"
                  >
                    <option value={1}>1 kW</option>
                    <option value={2}>2 kW</option>
                    <option value={3}>3 kW (Recommended)</option>
                    <option value={4}>4 kW</option>
                    <option value={5}>5 kW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">System Type *</label>
                  <select
                    value={newLead.system_type}
                    onChange={(e) => setNewLead({ ...newLead, system_type: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-primary focus:outline-none"
                  >
                    <option value="On-Grid">On-Grid (with Subsidy)</option>
                    <option value="Off-Grid">Off-Grid (with Battery)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-medium shadow-sm"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

