import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
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
  const [activeTab, setActiveTab] = useState<'invoices' | 'subsidy' | 'payouts'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subsidies, setSubsidies] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Subsidy edit modal
  const [editingSubsidy, setEditingSubsidy] = useState<any | null>(null);
  const [subsidyStatus, setSubsidyStatus] = useState('NOT_APPLIED');
  const [applicationRef, setApplicationRef] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [disbursementDate, setDisbursementDate] = useState('');
  const [savingSubsidy, setSavingSubsidy] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, subData, payData] = await Promise.all([
        api.get<any[]>('/finance/invoices'),
        api.get<any[]>('/finance/subsidies'),
        api.get<any[]>('/finance/payouts'),
      ]);
      setInvoices(invData || []);
      setSubsidies(subData || []);
      setPayouts(payData || []);
    } catch (err) {
      console.error('Failed to load accounting data', err);
    } finally {
      setLoading(false);
    }
  };

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
        status: subsidyStatus,
        application_no: applicationRef || undefined,
        application_ref: applicationRef || undefined,
        sanctioned_amount: approvedAmount ? Number(approvedAmount) : undefined,
        approved_amount: approvedAmount ? Number(approvedAmount) : undefined,
        disbursed_date: disbursementDate || undefined,
        disbursed_amount: subsidyStatus === 'DISBURSED' ? Number(approvedAmount) : undefined,
      });
      setEditingSubsidy(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update subsidy');
    } finally {
      setSavingSubsidy(false);
    }
  };

  const invoiceColumns = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (row: any) => (
        <span className="font-bold text-odoo-primary font-mono">{row.invoice_number}</span>
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
        const amt = row.sanctioned_amount || row.approved_amount || row.eligible_amount;
        return (
          <span className="font-bold text-emerald-700">
            {amt ? `₹${amt.toLocaleString()}` : 'Pending Assessment'}
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
              : row.status === 'APPLIED'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {row.status}
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
            setSubsidyStatus(row.status);
            setApplicationRef(row.application_no || row.application_ref || '');
            setApprovedAmount(row.sanctioned_amount || row.approved_amount || row.eligible_amount || 0);
            setDisbursementDate(row.disbursed_date || row.disbursement_date || '');
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
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading financial data...</div>
        ) : activeTab === 'invoices' ? (
          <ListView columns={invoiceColumns} data={invoices} />
        ) : activeTab === 'subsidy' ? (
          <ListView columns={subsidyColumns} data={subsidies} />
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
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Subsidy Workflow Stage <span className="text-red-500">*</span>
                </label>
                <select
                  value={subsidyStatus}
                  onChange={(e) => setSubsidyStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                >
                  <option value="NOT_APPLIED">NOT_APPLIED (Customer paperwork pending)</option>
                  <option value="APPLICATION_SUBMITTED">APPLICATION_SUBMITTED (National Portal)</option>
                  <option value="DISCOM_FEASIBILITY_APPROVED">DISCOM_FEASIBILITY_APPROVED (Technical Feasibility Cleared)</option>
                  <option value="INSTALLATION_INSPECTION_DONE">INSTALLATION_INSPECTION_DONE (DISCOM Net-meter Inspected)</option>
                  <option value="SUBSIDY_CLAIMED">SUBSIDY_CLAIMED (Online Claim Submitted)</option>
                  <option value="APPROVED">APPROVED (Subsidy Sanctioned)</option>
                  <option value="DISBURSED">DISBURSED (Funds Transferred via DBT to Bank)</option>
                  <option value="REJECTED">REJECTED (Documentation Ineligible)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  National Portal Application Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. MNRE-SOLAR-2026-99382"
                  value={applicationRef}
                  onChange={(e) => setApplicationRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Approved Subsidy Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Disbursement Date</label>
                <input
                  type="date"
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
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
