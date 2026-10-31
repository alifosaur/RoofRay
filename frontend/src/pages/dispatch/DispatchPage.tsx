import React, { useEffect, useState, useRef } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBarcode,
  faCamera,
  faTruck,
  faCheckCircle,
  faShieldAlt,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

// Strict fulfilment sequence (the backend enforces it; PACKED and DELIVERED also require every serial scanned)
const NEXT_STAGE: Record<string, { stage: string; label: string }> = {
  CONFIRMED: { stage: 'PACKING', label: 'Start Packing' },
  PACKING: { stage: 'PACKED', label: 'Mark Packed (all serials scanned)' },
  PACKED: { stage: 'DISPATCHED', label: 'Mark Dispatched' },
  DISPATCHED: { stage: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  OUT_FOR_DELIVERY: { stage: 'DELIVERED', label: 'Confirm Delivered (starts warranties, releases install job)' },
};

export const DispatchPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [pickList, setPickList] = useState<any | null>(null);
  const [serializedProducts, setSerializedProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [serialNoInput, setSerialNoInput] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningActive, setScanningActive] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const [activeWarehouseTab, setActiveWarehouseTab] = useState<'fulfillment' | 'lookup'>('fulfillment');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const fetchOrdersAndProducts = async () => {
    try {
      setLoading(true);
      const [allOrders, stockProducts] = await Promise.all([
        api.get<any[]>('/orders'),
        api.get<any[]>('/inventory/stock'),
      ]);
      // Active orders needing dispatch
      const dispatchable = (allOrders || []).filter(
        (o: any) => ['CONFIRMED', 'PACKING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(o.status)
      );
      setOrders(dispatchable);
      if (dispatchable.length > 0 && !selectedOrderId) {
        setSelectedOrderId(dispatchable[0].id);
      }
      const serialProds = (stockProducts || []).filter((p: any) => p.is_serialised);
      setSerializedProducts(serialProds);
      if (serialProds.length > 0 && !selectedProductId) {
        setSelectedProductId(serialProds[0].id);
      }
    } catch (err) {
      console.error('Failed to load dispatch data', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['order.', 'serial.'], fetchOrdersAndProducts);

  const handleUpdateStage = async (newStage: string) => {
    if (!selectedOrderId) return;
    setIsDelivering(true);
    setActionMessage(null);
    try {
      await api.put(`/dispatch/orders/${selectedOrderId}/stage`, { stage: newStage });
      setActionMessage({
        type: 'success',
        text: `Order stage updated to ${newStage.replace(/_/g, ' ')}!`,
      });
      await fetchOrdersAndProducts();
      await fetchOrderDetails(selectedOrderId);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || `Failed to update stage to ${newStage}`,
      });
    } finally {
      setIsDelivering(false);
    }
  };

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    try {
      const data = await api.get<any[]>(`/dispatch/lookup?query=${encodeURIComponent(lookupQuery.trim())}`);
      setLookupResults(data || []);
    } catch (err: any) {
      console.error('Lookup failed', err);
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const [orderData, serialsData] = await Promise.all([
        api.get<any>(`/orders/${orderId}`),
        api.get<any[]>(`/dispatch/serials?order_id=${orderId}`),
      ]);
      setSelectedOrder(orderData);
      setScannedItems(serialsData || []);
      setPickList(orderData.pick_list_id ? await api.get<any>(`/inventory/pick-lists/${orderData.pick_list_id}`) : null);
    } catch (err) {
      console.error('Failed to load order details', err);
    }
  };

  useEffect(() => {
    fetchOrdersAndProducts();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetails(selectedOrderId);
    }
  }, [selectedOrderId]);

  // Handle camera scanner toggle
  useEffect(() => {
    if (scanningActive) {
      const scanner = new Html5QrcodeScanner(
        'barcode-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (decodedText) => {
          setSerialNoInput(decodedText);
          setScanningActive(false);
          scanner.clear();
        },
        () => {}
      );
      scannerRef.current = scanner;
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [scanningActive]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedProductId || !serialNoInput.trim()) return;

    try {
      setActionMessage(null);
      await api.post('/dispatch/scan', {
        order_id: Number(selectedOrderId),
        product_id: Number(selectedProductId),
        serial_no: serialNoInput.trim().toUpperCase(),
      });
      setActionMessage({
        type: 'success',
        text: `Serial ${serialNoInput.trim().toUpperCase()} linked successfully!`,
      });
      setSerialNoInput('');
      fetchOrderDetails(selectedOrderId);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Scan failed (Duplicate or already assigned).',
      });
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrderId) return;
    try {
      setIsDelivering(true);
      setActionMessage(null);
      const updated = await api.post<any>(`/dispatch/orders/${selectedOrderId}/deliver`);
      setActionMessage({
        type: 'success',
        text: `Order ${updated.order_number} marked DELIVERED! All serial warranties initialized.`,
      });
      fetchOrdersAndProducts();
      fetchOrderDetails(selectedOrderId);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Gate blocked: Not all required BOM serials have been scanned.',
      });
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel breadcrumbs={[{ label: 'Warehouse & Logistics' }]} />

      {/* Top Warehouse Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center space-x-3 text-xs">
        <button
          onClick={() => setActiveWarehouseTab('fulfillment')}
          className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-2 ${
            activeWarehouseTab === 'fulfillment'
              ? 'bg-odoo-primary text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FontAwesomeIcon icon={faTruck} />
          <span>Fulfillment & Barcode Scanning Queue</span>
        </button>
        <button
          onClick={() => setActiveWarehouseTab('lookup')}
          className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-2 ${
            activeWarehouseTab === 'lookup'
              ? 'bg-odoo-primary text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FontAwesomeIcon icon={faShieldAlt} />
          <span>Stock Serial & Warranty Lookup</span>
        </button>
      </div>

      {activeWarehouseTab === 'fulfillment' ? (
        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Select Order */}
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5 self-start">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faTruck} className="text-odoo-primary" />
              <span>Orders Ready for Fulfillment</span>
            </h2>

            {orders.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">
                No active orders pending dispatch.
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`w-full text-left p-3 rounded border text-xs transition-all ${
                      selectedOrderId === o.id
                        ? 'border-odoo-primary bg-purple-50/50 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold text-gray-900">
                      <span>{o.order_number}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-semibold">
                        {o.status}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-1">
                      {o.customer_name || `Customer #${o.customer_id}`}{o.capacity_kw ? ` • ${o.capacity_kw} kW ${o.system_type || ''}` : ''}
                    </div>
                    <div className="text-odoo-primary font-semibold mt-1">
                      ₹{o.total_amount?.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Scanning Terminal & Stage Progression */}
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5 lg:col-span-2">
            {selectedOrder ? (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                  <div>
                    <span className="text-xs uppercase text-gray-400 font-bold">Fulfillment Target</span>
                    <h1 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h1>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedOrder.customer_name} • Current Stage: <span className="font-bold text-odoo-primary">{selectedOrder.status}</span>
                    </p>
                  </div>

                  {/* Stage Advancement Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {NEXT_STAGE[selectedOrder.status] && (
                      <button
                        onClick={() => handleUpdateStage(NEXT_STAGE[selectedOrder.status].stage)}
                        disabled={isDelivering}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded text-xs shadow-xs flex items-center gap-1.5"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                        <span>{NEXT_STAGE[selectedOrder.status].label}</span>
                      </button>
                    )}
                  </div>
                </div>

                {actionMessage && (
                  <div
                    className={`p-3 rounded text-xs mb-4 flex items-center gap-2 ${
                      actionMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={actionMessage.type === 'success' ? faCheckCircle : faExclamationTriangle}
                    />
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                {/* Items to pack (pick list sent on order confirmation) */}
                <div className="border border-gray-200 rounded-lg mb-6 overflow-x-auto">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-700 flex justify-between">
                    <span>Items to pack</span>
                    {pickList && <span className="text-gray-500 normal-case font-semibold">Pick list #{pickList.id} · {pickList.status}</span>}
                  </div>
                  {!pickList ? (
                    <div className="p-4 text-xs text-gray-500">No pick list for this order.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="text-gray-600 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-center">Required</th>
                          <th className="py-2 px-3 text-center">Scanned / picked</th>
                          <th className="py-2 px-3 text-center">In stock</th>
                          <th className="py-2 px-3">How</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pickList.lines.map((l: any) => {
                          const serialised = l.product?.is_serialised;
                          const done = serialised
                            ? scannedItems.filter((s) => s.product_id === l.product_id).length
                            : l.picked_qty;
                          const isService = l.product?.category === 'service';
                          const short = !isService && (l.product?.stock_quantity ?? 0) < l.required_qty;
                          return (
                            <tr key={l.id} className={done >= l.required_qty ? 'bg-emerald-50/50' : ''}>
                              <td className="py-2 px-3 font-medium text-gray-900">{l.product?.name}</td>
                              <td className="py-2 px-3 font-mono text-gray-500">{l.product?.sku}</td>
                              <td className="py-2 px-3 text-center font-bold">{l.required_qty}</td>
                              <td className={`py-2 px-3 text-center font-bold ${done >= l.required_qty ? 'text-emerald-700' : 'text-amber-700'}`}>{done}</td>
                              <td className={`py-2 px-3 text-center ${short ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                {isService ? '—' : l.product?.stock_quantity}
                              </td>
                              <td className="py-2 px-3 text-gray-500">{isService ? 'Service' : serialised ? 'Scan each serial' : 'Counted on packing'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Scanning Input Box */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faBarcode} className="text-odoo-primary" />
                    <span>Serial Item Barcode Scanner (html5-qrcode camera & USB scanner)</span>
                  </h3>

                  <form onSubmit={handleScanSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Serialized Component
                        </label>
                        <select
                          value={selectedProductId || ''}
                          onChange={(e) => setSelectedProductId(Number(e.target.value))}
                          className="w-full bg-white px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-odoo-primary"
                        >
                          {serializedProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.warranty_years} yrs warranty)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Barcode / Serial Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. INV-904821 or scan with camera"
                            value={serialNoInput}
                            onChange={(e) => setSerialNoInput(e.target.value)}
                            className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded text-xs font-mono uppercase focus:outline-none focus:border-odoo-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setScanningActive(!scanningActive)}
                            className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                              scanningActive
                                ? 'bg-rose-100 border-rose-300 text-rose-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <FontAwesomeIcon icon={faCamera} />
                            <span>{scanningActive ? 'Close Cam' : 'Camera'}</span>
                          </button>
                          <button
                            type="submit"
                            className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-4 py-2 rounded text-xs font-bold shadow-xs transition-colors"
                          >
                            Scan & Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {scanningActive && (
                    <div className="mt-4 p-3 bg-white border border-gray-300 rounded-lg flex flex-col items-center">
                      <div id="barcode-reader" className="w-full max-w-sm"></div>
                      <p className="text-[11px] text-gray-500 mt-2">
                        Point camera at QR code or 1D barcode on product label.
                      </p>
                    </div>
                  )}
                </div>

                {/* Scanned Serials List */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-teal-600" />
                    <span>Linked Serialized Items & Warranty Engine</span>
                  </h3>

                  {scannedItems.length === 0 ? (
                    <div className="text-xs text-gray-400 py-6 border border-dashed rounded text-center">
                      No serial numbers scanned yet for this order. Scan inverters, batteries, and charge controllers above.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                          <tr>
                            <th className="py-2 px-3">Serial #</th>
                            <th className="py-2 px-3">Component</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Scanned</th>
                            <th className="py-2 px-3">Warranty</th>
                            <th className="py-2 px-3">Warranty Start</th>
                            <th className="py-2 px-3">Warranty End</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono">
                          {scannedItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-bold text-odoo-primary">{item.serial_no}</td>
                              <td className="py-2 px-3 font-sans text-gray-800">{item.product?.name}</td>
                              <td className="py-2 px-3 font-sans">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    item.status === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-sans text-gray-600">
                                {item.scanned_at ? new Date(item.scanned_at + 'Z').toLocaleString() : '—'}
                              </td>
                              <td className="py-2 px-3 font-sans text-gray-600">{item.product?.warranty_years} yrs</td>
                              <td className="py-2 px-3 font-sans text-gray-600">
                                {item.delivered_on
                                  ? new Date(item.delivered_on).toLocaleDateString()
                                  : 'Set on delivery'}
                              </td>
                              <td className="py-2 px-3 font-sans font-semibold text-emerald-700">
                                {item.warranty_end
                                  ? new Date(item.warranty_end).toLocaleDateString()
                                  : 'Set on delivery'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-20 text-xs">
                Select an order from the left pane to begin serial number scanning and gate validation.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Stock Serial & Warranty Lookup Screen */
        <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
          <div className="bg-white rounded border border-odoo-border shadow-xs p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <FontAwesomeIcon icon={faBarcode} className="text-odoo-primary" />
              <span>Stock Serial Number & Warranty Inspection</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Enter or scan any component serial number or customer phone to inspect installation details, warranty dates, and service history.
            </p>

            <form onSubmit={handleLookup} className="flex gap-2 mb-6">
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Enter Serial # (e.g. INV-904821) or Customer Phone..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-odoo-primary focus:border-odoo-primary"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-5 py-2 bg-odoo-primary hover:bg-odoo-primary-dark text-white font-bold text-xs rounded shadow-xs"
              >
                {lookupLoading ? 'Searching...' : 'Search Serial'}
              </button>
            </form>

            {lookupResults.length > 0 ? (
              <div className="space-y-4">
                {lookupResults.map((r, idx) => (
                  <div key={idx} className="p-4 bg-gray-50/70 rounded border border-gray-200 text-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-odoo-primary">{r.serial_no}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            {r.product_name}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">
                          Assigned to: <strong className="text-gray-900">{r.customer_name}</strong> ({r.customer_phone}) • {r.customer_address}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        r.in_warranty
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {r.in_warranty ? `Active Warranty (${r.days_left} days left)` : 'Warranty Expired'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-white rounded border border-gray-100 text-[11px]">
                      <div>
                        <span className="text-gray-400 block">Delivered On:</span>
                        <strong className="text-gray-800">{r.delivered_on || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Warranty Expiration:</span>
                        <strong className="text-gray-800">{r.warranty_end || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Coverage Status:</span>
                        <strong className={r.in_warranty ? 'text-emerald-700' : 'text-red-600'}>
                          {r.in_warranty ? 'Free Warranty Service' : 'Billable Repair'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Service History:</span>
                        <strong className="text-gray-800">{r.service_history?.length || 0} tickets</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : lookupQuery && !lookupLoading ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No matching serialized item found for "{lookupQuery}".
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
