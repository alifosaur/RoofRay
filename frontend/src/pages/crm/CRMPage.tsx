import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ControlPanel, ViewType } from '../../components/odoo/ControlPanel';
import { KanbanView, KanbanColumn, KanbanItem } from '../../components/odoo/KanbanView';
import { ListView, ColumnDef } from '../../components/odoo/ListView';

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

  const fetchLeads = async () => {
    try {
      const data = await api.get<any[]>('/leads');
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeads();
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
        availableViews={['kanban', 'list']}
      />

      {view === 'kanban' ? (
        <KanbanView
          columns={columns}
          items={kanbanItems}
          onItemClick={(item) => navigate(`/web/crm/${item.id}`)}
          onMoveItem={handleMove}
        />
      ) : (
        <ListView
          columns={listColumns}
          data={filteredLeads}
          onRowClick={(row) => navigate(`/web/crm/${row.id}`)}
        />
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
