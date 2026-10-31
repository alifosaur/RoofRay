import React, { useEffect, useState } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { useParams, useNavigate } from 'react-router-dom';
import { api, downloadFile } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { FormView, FormTab } from '../../components/odoo/FormView';
import { SmartButton } from '../../components/odoo/SmartButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faMoneyBillWave,
  faBoxes,
  faTools,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';

const ORDER_STAGES = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'INSTALLED', label: 'Installed' },
  { key: 'CLOSED', label: 'Closed' },
];

export const OrderFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>(`/orders/${id}`);
      setOrder(data);
      if (data && data.total_amount && data.paid_amount !== undefined) {
        setPaymentAmount(Math.max(0, data.total_amount - data.paid_amount));
      }
    } catch (err: any) {
      console.error('Failed to load order', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['order.', 'serial.', 'job.', 'invoice.'], fetchOrder);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleConfirmOrder = async () => {
    try {
      setActionError('');
      await api.post(`/orders/${id}/confirm`);
      fetchOrder();
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm order');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPayment(true);
      setActionError('');
      await api.post(`/orders/${id}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        transaction_ref: paymentRef || undefined,
      });
      setShowPaymentModal(false);
      fetchOrder();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex-1 p-8 text-center text-gray-500 text-sm">
        Loading order details...
      </div>
    );
  }

  const smartButtons = (
    <>
      <SmartButton
        icon={faBoxes}
        label="Pick List"
        count={order.pick_list_id ? 'Generated' : 'None'}
        onClick={() => navigate('/web/inventory')}
      />
      <SmartButton
        icon={faTools}
        label="Install Job"
        count={order.status === 'INSTALLED' ? 'Done' : 'Scheduled'}
        onClick={() => navigate('/web/jobs')}
      />
      <SmartButton
        icon={faMoneyBillWave}
        label="Paid"
        count={`₹${order.paid_amount.toLocaleString()}`}
      />
    </>
  );

  const headerButtons = (
    <>
      {order.status === 'DRAFT' && (
        <button
          onClick={handleConfirmOrder}
          disabled={order.paid_amount <= 0}
          title={order.paid_amount <= 0 ? 'Record the advance or full payment first' : undefined}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
        >
          <FontAwesomeIcon icon={faCheckCircle} />
          <span>Confirm Order (sends pick list to warehouse)</span>
        </button>
      )}

      {order.invoice_id && (
        <button
          onClick={() => downloadFile(`/finance/invoices/${order.invoice_id}/pdf`, `Invoice_${order.order_number}.pdf`).catch((e) => alert(e.message))}
          className="border border-gray-300 bg-white px-3 py-1 rounded text-xs font-semibold"
        >
          Invoice PDF
        </button>
      )}

      {order.paid_amount < order.total_amount && order.status !== 'CLOSED' && (
        <button
          onClick={() => setShowPaymentModal(true)}
          className="bg-odoo-accent hover:bg-teal-700 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
        >
          <FontAwesomeIcon icon={faMoneyBillWave} />
          <span>Record Payment</span>
        </button>
      )}

      {['CONFIRMED', 'PACKING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(order.status) && (
        <button
          onClick={() => navigate('/web/dispatch')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
        >
          <FontAwesomeIcon icon={faTruck} />
          <span>Dispatch & Scan Serials</span>
        </button>
      )}
    </>
  );

  const fields = (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">Customer</label>
          <div className="text-sm font-semibold text-gray-800">
            {order.customer_name || `Customer #${order.customer_id}`}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">System Specifications</label>
          <div className="text-sm font-semibold text-gray-800">
            {order.capacity_kw} kW {order.system_type}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Total Order Amount</label>
          <div className="text-sm font-bold text-odoo-primary">
            ₹{order.total_amount?.toLocaleString()}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Payment Status</label>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
              order.payment_status === 'PAID'
                ? 'bg-emerald-100 text-emerald-800'
                : order.payment_status === 'PARTIAL'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {order.payment_status} (₹{order.paid_amount?.toLocaleString()} paid)
          </span>
        </div>
      </div>
    </div>
  );

  const tabs: FormTab[] = [
    {
      id: 'lines',
      label: `Order Lines (${order.order_lines?.length || 0})`,
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.order_lines?.map((line: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-4 font-medium text-gray-800">
                    {line.product_name || `Product #${line.product_id}`}
                  </td>
                  <td className="py-2.5 px-4 text-center">{line.quantity}</td>
                  <td className="py-2.5 px-4 text-right">₹{line.unit_price?.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    ₹{line.subtotal?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
              <tr>
                <td colSpan={3} className="py-2.5 px-4 text-right text-gray-600">Total:</td>
                <td className="py-2.5 px-4 text-right text-odoo-primary text-sm">
                  ₹{order.total_amount?.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ),
    },
    {
      id: 'payments',
      label: `Payments (${order.payments?.length || 0})`,
      content: (
        <div>
          {(!order.payments || order.payments.length === 0) ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No payments recorded yet. Click "Record Payment" above to log an advance or full receipt.
            </div>
          ) : (
            <table className="w-full text-left text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Reference</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-4 font-semibold text-odoo-primary">{p.receipt_number}</td>
                    <td className="py-2.5 px-4">{p.payment_method}</td>
                    <td className="py-2.5 px-4 text-gray-500">{p.reference_no || '-'}</td>
                    <td className="py-2.5 px-4 text-gray-500">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                      ₹{p.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[
          { label: 'Sales Orders', onClick: () => navigate('/web/orders') },
          { label: order.order_number },
        ]}
      />

      <FormView
        title={order.order_number}
        subtitle="Sales Order"
        stages={ORDER_STAGES}
        currentStage={order.status}
        headerButtons={headerButtons}
        smartButtons={smartButtons}
        fields={fields}
        tabs={tabs}
        auditLogs={order.audit_logs || []}
      />

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">Record Order Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="BANK">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref, Cheque #, NEFT UTR"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 50% advance received"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-medium shadow-xs disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
