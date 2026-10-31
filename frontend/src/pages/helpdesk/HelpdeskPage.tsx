import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { KanbanView, KanbanColumn, KanbanItem } from '../../components/odoo/KanbanView';
import { ListView } from '../../components/odoo/ListView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faShieldAlt,
  faCheckCircle,
  faTimesCircle,
  faWrench,
  faUserCheck,
  faFileInvoiceDollar,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

const TICKET_COLUMNS: KanbanColumn[] = [
  { id: 'OPEN', title: 'Open', color: 'bg-blue-500' },
  { id: 'ASSIGNED', title: 'Assigned', color: 'bg-indigo-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'RESOLVED', title: 'Resolved', color: 'bg-teal-500' },
  { id: 'CUSTOMER_CONFIRMED', title: 'Customer Confirmed', color: 'bg-emerald-500' },
  { id: 'CLOSED', title: 'Closed', color: 'bg-slate-700' },
];

export const HelpdeskPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'kanban' | 'list'>('kanban');

  // Support lookup
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [searchingLookup, setSearchingLookup] = useState(false);

  // Selected ticket / modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [partsCost, setPartsCost] = useState(0);
  const [labourCost, setLabourCost] = useState(0);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  // Create ticket modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCustomerId, setNewCustomerId] = useState<number | null>(null);
  const [newSerialId, setNewSerialId] = useState<number | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/tickets');
      setTickets(data || []);
      if (selectedTicket) {
        const updated = (data || []).find((t: any) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleLookupSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    try {
      setSearchingLookup(true);
      const results = await api.get<any[]>(`/tickets/lookup?query=${encodeURIComponent(lookupQuery.trim())}`);
      setLookupResults(results || []);
    } catch (err) {
      console.error('Failed warranty lookup', err);
    } finally {
      setSearchingLookup(false);
    }
  };

  const handleCreateTicketFromSerial = (item: any) => {
    setNewCustomerId(item.customer.id);
    setNewSerialId(item.serial.id);
    setNewTitle(`Service Request for ${item.product.name} (${item.serial.serial_no})`);
    setShowCreateModal(true);
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) return;
    try {
      setSubmittingAction(true);
      await api.post('/tickets', {
        title: newTitle,
        description: newDescription,
        customer_id: newCustomerId,
        serial_item_id: newSerialId || undefined,
        priority: 'MEDIUM',
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmittingAction(true);
      setActionError('');
      await api.put(`/tickets/${selectedTicket.id}/resolve`, {
        resolution_notes: resolutionNotes,
        parts_cost: Number(partsCost),
        labour_cost: Number(labourCost),
      });
      setShowResolveModal(false);
      fetchTickets();
      const updated = await api.get(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve ticket');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCustomerConfirm = async (ticketId: number) => {
    try {
      setActionError('');
      await api.post(`/tickets/${ticketId}/customer-confirm`);
      fetchTickets();
      const updated = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm ticket');
    }
  };

  const handleCloseTicket = async (ticketId: number) => {
    try {
      setActionError('');
      await api.post(`/tickets/${ticketId}/close`);
      fetchTickets();
      const updated = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(updated);
    } catch (err: any) {
      setActionError(err.message || 'Cannot close ticket: Gate blocked.');
    }
  };

  const kanbanItems: KanbanItem[] = tickets.map((t) => ({
    id: t.id,
    columnId: t.status,
    title: t.ticket_number,
    subtitle: `${t.title} • ${t.customer_name}`,
    tags: [
      {
        label: t.is_billable ? 'Billable (Out of Warranty)' : 'Free (Under Warranty)',
        color: t.is_billable ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
      },
    ],
  }));

  const columns = [
    {
      key: 'ticket_number',
      header: 'Ticket #',
      accessor: (row: any) => (
        <span className="font-bold text-odoo-primary font-mono">{row.ticket_number}</span>
      ),
    },
    {
      key: 'title',
      header: 'Subject',
      accessor: (row: any) => row.title,
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (row: any) => row.customer_name || `Customer #${row.customer_id}`,
    },
    {
      key: 'is_billable',
      header: 'Warranty Status',
      accessor: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.is_billable
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {row.is_billable ? 'Billable' : 'Free (In-Warranty)'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: any) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Helpdesk & Warranty After-Sales' }]}
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v as 'kanban' | 'list')}
        availableViews={['kanban', 'list']}
      />

      {/* Support & Warranty Fast Lookup Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-xs">
        <form onSubmit={handleLookupSearch} className="max-w-3xl">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faShieldAlt} className="text-odoo-primary" />
            <span>Fast Warranty & After-Sales Lookup (Customer Name, Phone, or Serial #)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
              />
              <input
                type="text"
                placeholder="e.g. +91 98765 43210, Sharma, or INV-482019"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-odoo-primary"
              />
            </div>
            <button
              type="submit"
              disabled={searchingLookup}
              className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-5 py-2 rounded text-xs font-bold shadow-xs transition-colors"
            >
              {searchingLookup ? 'Searching...' : 'Lookup Warranty'}
            </button>
          </div>
        </form>

        {/* Lookup Results Cards */}
        {lookupResults.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {lookupResults.map((item, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{item.customer.name}</h4>
                      <p className="text-xs text-gray-500 font-mono">{item.customer.phone}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        item.in_warranty
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      <FontAwesomeIcon icon={item.in_warranty ? faCheckCircle : faTimesCircle} />
                      <span>{item.in_warranty ? 'IN WARRANTY' : 'OUT OF WARRANTY'}</span>
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1 pt-2 border-t border-gray-200">
                    <div>
                      <span className="font-semibold">Component:</span> {item.product.name}
                    </div>
                    <div>
                      <span className="font-semibold">Serial Number:</span>{' '}
                      <span className="font-mono text-odoo-primary font-bold">{item.serial.serial_no}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Delivered On:</span>{' '}
                      {item.serial.delivered_on
                        ? new Date(item.serial.delivered_on).toLocaleDateString()
                        : 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">Warranty Expiration:</span>{' '}
                      {item.serial.warranty_end
                        ? `${new Date(item.serial.warranty_end).toLocaleDateString()} (${item.warranty_days_left} days left)`
                        : 'N/A'}
                    </div>
                    <div>
                      <span className="font-semibold">Service History:</span>{' '}
                      {item.service_history?.length || 0} previous ticket(s)
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => handleCreateTicketFromSerial(item)}
                    className="bg-odoo-accent hover:bg-teal-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>Open Support Ticket</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Tickets Content */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading tickets...</div>
        ) : currentView === 'kanban' ? (
          <KanbanView
            columns={TICKET_COLUMNS}
            items={kanbanItems}
            onItemClick={(item) => {
              const t = tickets.find((x) => x.id === item.id);
              if (t) setSelectedTicket(t);
            }}
          />
        ) : (
          <ListView
            columns={columns}
            data={tickets}
            onRowClick={(row) => setSelectedTicket(row)}
          />
        )}
      </div>

      {/* Selected Ticket Drawer / Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-mono text-odoo-primary font-bold">
                  {selectedTicket.ticket_number}
                </span>
                <h3 className="text-base font-bold text-gray-900">{selectedTicket.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded border border-gray-200">
                <div>
                  <span className="text-gray-500 font-medium">Customer:</span>
                  <div className="font-bold text-gray-800">{selectedTicket.customer_name}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Warranty Rule:</span>
                  <div className="font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        selectedTicket.is_billable
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {selectedTicket.is_billable
                        ? 'Billable (Repair Invoice Generated on Resolution)'
                        : 'Free Under Warranty'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Status:</span>
                  <div className="font-bold text-odoo-primary">{selectedTicket.status}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Created:</span>
                  <div className="text-gray-700">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-medium">Description:</span>
                <p className="mt-1 text-gray-800 bg-white p-2.5 rounded border border-gray-200">
                  {selectedTicket.description || 'No detailed issue notes recorded.'}
                </p>
              </div>

              {selectedTicket.resolution_notes && (
                <div>
                  <span className="text-gray-500 font-medium">Resolution Notes:</span>
                  <p className="mt-1 text-gray-800 bg-emerald-50/50 p-2.5 rounded border border-emerald-200">
                    {selectedTicket.resolution_notes}
                  </p>
                </div>
              )}

              {/* Action Buttons for Ticket Lifecycle */}
              <div className="pt-3 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
                {selectedTicket.status === 'OPEN' || selectedTicket.status === 'ASSIGNED' || selectedTicket.status === 'IN_PROGRESS' ? (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <FontAwesomeIcon icon={faWrench} />
                    <span>Resolve Ticket</span>
                  </button>
                ) : null}

                {selectedTicket.status === 'RESOLVED' && (
                  <button
                    onClick={() => handleCustomerConfirm(selectedTicket.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <FontAwesomeIcon icon={faUserCheck} />
                    <span>Record Customer Satisfaction Confirmation</span>
                  </button>
                )}

                {selectedTicket.status === 'CUSTOMER_CONFIRMED' && (
                  <button
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span>Close Ticket</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal with Auto-billing parameters */}
      {showResolveModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">Resolve Ticket: {selectedTicket.ticket_number}</h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Replaced faulty MCB and re-calibrated solar inverter output."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              {selectedTicket.is_billable ? (
                <div className="p-3 bg-amber-50 rounded border border-amber-200 space-y-3">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} />
                    <span>Out of Warranty: Automatic Repair Invoice Generation</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Parts Cost (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={partsCost}
                        onChange={(e) => setPartsCost(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Labour Cost (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={labourCost}
                        onChange={(e) => setLabourCost(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  ✓ Free under warranty. No charges billed to the customer.
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingAction ? 'Saving...' : 'Resolve Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">New After-Sales Ticket</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Ticket Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Issue Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the complaint reported by customer..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingAction ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
