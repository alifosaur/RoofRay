import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, downloadFile } from '../../api/client';
import { FormView, FormTab } from '../../components/odoo/FormView';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faCheckCircle, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

export const QuoteFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<any>(null);

  const fetchQuote = async () => {
    try {
      const data = await api.get<any>(`/quotes/${id}`);
      setQuote(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [id]);

  if (!quote) {
    return <div className="p-8 text-center text-gray-400">Loading quotation...</div>;
  }

  const stages = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'SENT', label: 'Quotation Sent' },
    { key: 'ACCEPTED', label: 'Accepted (Won)' },
    { key: 'REJECTED', label: 'Cancelled' },
  ];

  const handleSubmitToWarehouse = async () => {
    if (!window.confirm('Submit this quotation to the warehouse? This will confirm the order and generate the warehouse pick list.')) return;
    try {
      const res = await api.post<any>(`/quotes/${id}/accept`);
      if (res.order_id) {
        try {
          await api.post(`/orders/${res.order_id}/confirm`);
        } catch (e) {
          console.warn('Order confirmation handled or already confirmed', e);
        }
      }
      alert(`Quotation successfully submitted to warehouse! Sales Order ${res.order_number} confirmed and warehouse pick list generated.`);
      navigate(`/web/orders/${res.order_id}`);
    } catch (err: any) {
      alert(err.message || 'Error submitting quotation to warehouse');
    }
  };

  const handleDownloadPDF = () => {
    downloadFile(`/quotes/${id}/pdf`, `Quote_${id}.pdf`).catch((err) =>
      alert(err.message || 'Quotation PDF not available')
    );
  };

  const tabs: FormTab[] = [
    {
      id: 'lines',
      label: 'Order Lines (Exploded BOM)',
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-gray-200">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 border-r">Item / Product Specification</th>
                <th className="px-3 py-2 border-r w-24">Warranty</th>
                <th className="px-3 py-2 border-r text-center w-20">Quantity</th>
                <th className="px-3 py-2 border-r text-right w-28">Unit Price</th>
                <th className="px-3 py-2 text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quote.lines.map((line: any) => (
                <tr key={line.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 border-r font-medium text-gray-900">
                    {line.product?.name || `Product #${line.product_id}`}
                    <span className="block text-[10px] text-gray-500 font-normal">SKU: {line.product?.sku}</span>
                  </td>
                  <td className="px-3 py-2 border-r text-gray-600">
                    {line.product?.warranty_years ? `${line.product.warranty_years} Years` : '-'}
                  </td>
                  <td className="px-3 py-2 border-r text-center font-bold text-gray-800">
                    {line.quantity}
                  </td>
                  <td className="px-3 py-2 border-r text-right text-gray-700">
                    ₹{line.unit_price.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    ₹{line.subtotal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Calculation Summary */}
          <div className="flex justify-end mt-4">
            <div className="w-72 bg-gray-50 p-3 rounded border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Hardware & Service Subtotal:</span>
                <span className="font-semibold text-gray-900">₹{quote.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Govt. Rooftop Subsidy (-):</span>
                <span className="font-semibold">-₹{quote.subsidy_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Composite GST Taxes (+):</span>
                <span className="font-semibold text-gray-900">+₹{quote.tax_amount.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-sm text-odoo-primary">
                <span>Net Payable:</span>
                <span>₹{quote.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      label: 'Terms & Warranty',
      content: (
        <div className="text-xs text-gray-700 space-y-2">
          <p>• <b>Solar Panels:</b> 20-year linear power performance warranty.</p>
          <p>• <b>Solar Inverter & Battery Bank:</b> 2-year manufacturer replacement warranty.</p>
          <p>• <b>Installation & Structure:</b> 1-year comprehensive free maintenance.</p>
          <p>• <b>Subsidy Approval:</b> Subject to National Solar Portal DISCOM inspection.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[
          { label: 'Quotations', onClick: () => navigate('/web/quotes') },
          { label: quote.quote_number },
        ]}
      />

      {/* Salesman Directive Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-purple-50/50 to-white border-b border-purple-200 px-6 py-2.5 flex items-center justify-between text-xs text-[#6B4B63]">
        <div className="flex items-center gap-2.5">
          <span className="font-bold bg-[#6B4B63] text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
            Sales Directive
          </span>
          <span className="text-[#212529]">
            Verify this quotation prepared according to client requirements. Once confirmed with the client, <strong>submit it to warehouse</strong> to generate the pick list and initiate dispatch.
          </span>
        </div>
      </div>

      <FormView
        title={quote.quote_number}
        subtitle="Rooftop Solar Quotation (Client Specification)"
        stages={stages}
        currentStage={quote.status}
        headerButtons={
          <>
            {quote.status !== 'ACCEPTED' && (
              <button
                onClick={handleSubmitToWarehouse}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Submit to Warehouse (Confirm Order & Generate Pick List)</span>
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 shadow-xs"
            >
              <FontAwesomeIcon icon={faFilePdf} />
              <span>Download PDF Quote</span>
            </button>
          </>
        }
        fields={
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-gray-500 block font-medium">Customer</span>
              <span className="text-gray-900 font-bold text-sm">Customer #{quote.customer_id}</span>
              <span className="text-gray-500 block mt-2 font-medium">Associated Lead</span>
              <span className="text-odoo-primary font-semibold">Lead #{quote.lead_id}</span>
            </div>
            <div>
              <span className="text-gray-500 block font-medium">Net Quotation Total</span>
              <span className="text-xl font-bold text-odoo-primary">₹{quote.total_amount.toLocaleString()}</span>
              <span className="text-gray-500 block mt-2 font-medium">Quotation Date</span>
              <span className="text-gray-800">{new Date(quote.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        }
        tabs={tabs}
      />
    </div>
  );
};

