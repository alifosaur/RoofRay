import React, { useEffect, useState } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { api, downloadFile } from '../../api/client';
import { SUBSIDY_STEPS, nextSubsidyStep } from '../../constants/subsidy';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { ListView } from '../../components/odoo/ListView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoiceDollar,
  faHandHoldingUsd,
  faCheck,
  faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons';

export const AccountingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'subsidy' | 'payouts' | 'expenses'>('invoices');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({ category: '', amount: '', expense_date: '', order_id: '', description: '' });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subsidies, setSubsidies] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Subsidy edit modal
  const [editingSubsidy, setEditingSubsidy] = useState<any | null>(null);
  const [subsidyStatus, setSubsidyStatus] = useState('');
  const [applicationRef, setApplicationRef] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [disbursedAmount, setDisbursedAmount] = useState<number>(0);
  const [stepDate, setStepDate] = useState('');
  const [stepNotes, setStepNotes] = useState('');
  const [stepDoc, setStepDoc] = useState<File | null>(null);
  const [savingSubsidy, setSavingSubsidy] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, subData, payData, expData] = await Promise.all([
        api.get<any[]>('/finance/invoices'),
        api.get<any[]>('/finance/subsidies'),
        api.get<any[]>('/finance/payouts'),
        api.get<any[]>('/finance/expenses'),
      ]);
      setExpenses(expData || []);
      setInvoices(invData || []);
      setSubsidies(subData || []);
      setPayouts(payData || []);
    } catch (err) {
      console.error('Failed to load accounting data', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['order.', 'invoice.', 'finance.', 'payout.', 'subsidy.', 'job.'], fetchData);

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisbursePayout = async (payoutId: number) => {
    try {
      await api.post(`/finance/payouts/${payoutId}/pay`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to pay technician');
    }
  };

  const handleUpdateSubsidy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubsidy) return;
    try {
      setSavingSubsidy(true);
      await api.put(`/finance/subsidies/${editingSubsidy.id}`, {
        sanctioned_amount: Number(approvedAmount),
        disbursed_amount: Number(disbursedAmount),
      });
      if (subsidyStatus) {
        const fd = new FormData();
        fd.append('status', subsidyStatus);
        if (stepDate) fd.append('event_date', stepDate);
        if (applicationRef) fd.append('reference_no', applicationRef);
        if (stepNotes) fd.append('notes', stepNotes);
        if (stepDoc) fd.append('document', stepDoc);
        await api.post(`/finance/subsidies/${editingSubsidy.id}/steps`, fd);
      }
      setEditingSubsidy(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update subsidy');
    } finally {
      setSavingSubsidy(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', {
        category: newExpense.category,
        amount: Number(newExpense.amount),
        expense_date: newExpense.expense_date || undefined,
        order_id: newExpense.order_id ? Number(newExpense.order_id) : undefined,
        description: newExpense.description || undefined,
      });
      setNewExpense({ category: '', amount: '', expense_date: '', order_id: '', description: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const invoiceColumns = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (row: any) => (
        <button
          onClick={() => downloadFile(`/finance/invoices/${row.id}/pdf`, `${row.invoice_number}.pdf`).catch((err) => alert(err.message))}
          className="font-bold text-odoo-primary font-mono underline"
          title="Download PDF"
        >
          {row.invoice_number}
        </button>
      ),
    },
    {
      key: 'invoice_type',
      header: 'Type',
      accessor: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.invoice_type === 'ORDER'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.invoice_type === 'ORDER' ? 'System Installation' : 'Out-of-Warranty Repair'}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (row: any) => row.customer_name || `Customer #${row.customer_id}`,
    },
    {
      key: 'invoice_date',
      header: 'Date',
      accessor: (row: any) => new Date(row.invoice_date).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.status === 'PAID'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      accessor: (row: any) => (
        <span className="font-bold text-gray-900">₹{row.total_amount?.toLocaleString()}</span>
      ),
    },
  ];

  const subsidyColumns = [
    {
      key: 'customer',
      header: 'Customer',
      accessor: (row: any) => (
        <span className="font-bold text-gray-800">{row.customer_name || `Customer #${row.customer_id}`}</span>
      ),
    },
    {
      key: 'order_id',
      header: 'Order #',
      accessor: (row: any) => `Order #${row.order_id}`,
    },
    {
      key: 'application_ref',
      header: 'Application Ref',
      accessor: (row: any) => <span className="font-mono text-gray-600">{row.application_no || row.application_ref || '-'}</span>,
    },
    {
      key: 'approved_amount',
      header: 'Approved Subsidy',
      accessor: (row: any) => {
        return (
          <span className="font-bold text-emerald-700">
            {row.sanctioned_amount ? `₹${row.sanctioned_amount.toLocaleString()}` : row.remarks?.startsWith('Not eligible') ? 'Not eligible' : `Eligible ₹${(row.eligible_amount || 0).toLocaleString()}`}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Subsidy Stage',
      accessor: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.status === 'DISBURSED'
              ? 'bg-emerald-100 text-emerald-800'
              : row.status === 'APPROVED'
              ? 'bg-blue-100 text-blue-800'
              : row.status === 'REJECTED'
              ? 'bg-red-100 text-red-800'
              : row.status === 'NOT_APPLIED'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {SUBSIDY_STEPS.find((st) => st.key === row.status)?.label || row.status}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      accessor: (row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingSubsidy(row);
            setSubsidyStatus('');
            setApplicationRef('');
            setStepDate('');
            setStepNotes('');
            setStepDoc(null);
            setApprovedAmount(row.sanctioned_amount || 0);
            setDisbursedAmount(row.disbursed_amount || 0);
          }}
          className="bg-odoo-accent hover:bg-teal-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold shadow-xs"
        >
          Update Stage
        </button>
      ),
    },
  ];

  const payoutColumns = [
    {
      key: 'technician',
      header: 'Technician',
      accessor: (row: any) => <span className="font-bold text-gray-800">{row.technician_name}</span>,
    },
    {
      key: 'job_id',
      header: 'Job #',
      accessor: (row: any) => `Job #${row.job_id}`,
    },
    {
      key: 'hours_worked',
      header: 'Hours Worked',
      accessor: (row: any) => `${row.hours_worked} hrs`,
    },
    {
      key: 'hourly_rate',
      header: 'Hourly Rate',
      accessor: (row: any) => `₹${row.hourly_rate?.toLocaleString()}/hr`,
    },
    {
      key: 'total_payout',
      header: 'Total Payout',
      accessor: (row: any) => (
        <span className="font-bold text-odoo-primary">₹{row.total_payout?.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.is_paid ? 'Disbursed' : 'Pending Payment'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      accessor: (row: any) =>
        !row.is_paid ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDisbursePayout(row.id);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold shadow-xs flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faCheck} />
            <span>Disburse Payout</span>
          </button>
        ) : (
          <span className="text-gray-400 text-xs italic">Paid</span>
        ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel breadcrumbs={[{ label: 'Invoicing, Subsidy & Technician Payouts' }]} />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 pt-3 flex space-x-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'invoices'
              ? 'border-odoo-primary text-odoo-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FontAwesomeIcon icon={faFileInvoiceDollar} />
          <span>Customer Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subsidy')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'subsidy'
              ? 'border-odoo-primary text-odoo-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FontAwesomeIcon icon={faHandHoldingUsd} />
          <span>National Solar Subsidy Tracking ({subsidies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'payouts'
              ? 'border-odoo-primary text-odoo-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} />
          <span>Technician Payouts ({payouts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'expenses' ? 'border-odoo-primary text-odoo-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>Other Costs ({expenses.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading financial data...</div>
        ) : activeTab === 'invoices' ? (
          <ListView columns={invoiceColumns} data={invoices} />
        ) : activeTab === 'subsidy' ? (
          <ListView columns={subsidyColumns} data={subsidies} />
        ) : activeTab === 'expenses' ? (
          <div className="space-y-4">
            <form onSubmit={handleAddExpense} className="bg-white border border-gray-200 rounded p-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs items-end">
              <input required placeholder="Category (e.g. transport)" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5" />
              <input required type="number" min="0.01" step="0.01" placeholder="Amount ₹" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5" />
              <input type="date" min={new Date().toISOString().split('T')[0]} value={newExpense.expense_date} onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5" aria-label="Expense date" />
              <input type="number" placeholder="Order ID (optional)" value={newExpense.order_id} onChange={(e) => setNewExpense({ ...newExpense, order_id: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5" />
              <input placeholder="Description" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5" />
              <button className="bg-odoo-primary text-white rounded px-3 py-1.5 font-semibold">Record cost</button>
            </form>
            {expenses.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-8">No other costs recorded yet.</div>
            ) : (
              <ListView
                columns={[
                  { key: 'expense_date', header: 'Date', accessor: (r: any) => r.expense_date },
                  { key: 'category', header: 'Category', accessor: (r: any) => r.category },
                  { key: 'amount', header: 'Amount', accessor: (r: any) => `₹${r.amount.toLocaleString('en-IN')}` },
                  { key: 'order_id', header: 'Order', accessor: (r: any) => (r.order_id ? `#${r.order_id}` : '—') },
                  { key: 'description', header: 'Description', accessor: (r: any) => r.description || '' },
                ]}
                data={expenses}
              />
            )}
          </div>
        ) : (
          <ListView columns={payoutColumns} data={payouts} />
        )}
      </div>

      {/* Update Subsidy Modal */}
      {editingSubsidy && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">
                Update National Solar Subsidy: {editingSubsidy.customer_name}
              </h3>
              <button
                onClick={() => setEditingSubsidy(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubsidy} className="p-5 space-y-4 text-xs">
              {editingSubsidy.events?.length > 0 && (
                <ol className="space-y-1 border border-gray-200 rounded p-2 bg-gray-50">
                  {editingSubsidy.events.map((ev: any) => (
                    <li key={ev.id} className="flex justify-between gap-2">
                      <span>{SUBSIDY_STEPS.find((st) => st.key === ev.status)?.label || ev.status} · {ev.event_date}</span>
                      <span className="text-gray-500">
                        {ev.reference_no} {ev.document_url && <a href={ev.document_url} target="_blank" rel="noreferrer" className="underline">document</a>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Advance tracker</label>
                <select value={subsidyStatus} onChange={(e) => setSubsidyStatus(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary">
                  <option value="">No step change</option>
                  {nextSubsidyStep(editingSubsidy.status) && (
                    <option value={nextSubsidyStep(editingSubsidy.status).key}>Next: {nextSubsidyStep(editingSubsidy.status).label}</option>
                  )}
                  {!['DISBURSED', 'REJECTED'].includes(editingSubsidy.status) && <option value="REJECTED">Rejected</option>}
                </select>
              </div>
              {subsidyStatus && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-gray-700 font-medium">Date
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={stepDate} onChange={(e) => setStepDate(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary mt-1" />
                  </label>
                  <label className="block text-gray-700 font-medium">Reference number
                    <input type="text" value={applicationRef} onChange={(e) => setApplicationRef(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary mt-1 font-mono" />
                  </label>
                  <label className="block text-gray-700 font-medium col-span-2">Notes
                    <input type="text" value={stepNotes} onChange={(e) => setStepNotes(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary mt-1" />
                  </label>
                  <label className="block text-gray-700 font-medium col-span-2">Document (PDF or image)
                    <input type="file" accept=".pdf,image/*" onChange={(e) => setStepDoc(e.target.files?.[0] || null)} className="mt-1" />
                  </label>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-gray-700 font-medium">Sanctioned amount (₹)
                  <input type="number" step="0.01" min="0" value={approvedAmount} onChange={(e) => setApprovedAmount(Number(e.target.value))} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary mt-1" />
                </label>
                <label className="block text-gray-700 font-medium">Disbursed amount (₹)
                  <input type="number" step="0.01" min="0" value={disbursedAmount} onChange={(e) => setDisbursedAmount(Number(e.target.value))} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary mt-1" />
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingSubsidy(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubsidy}
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-bold shadow-xs disabled:opacity-50"
                >
                  {savingSubsidy ? 'Updating...' : 'Save Subsidy Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
