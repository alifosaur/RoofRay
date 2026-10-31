import React, { useEffect, useState, useRef } from 'react';
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

export const DispatchPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [serializedProducts, setSerializedProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [serialNoInput, setSerialNoInput] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningActive, setScanningActive] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fetchOrdersAndProducts = async () => {
    try {
      setLoading(true);
      const [allOrders, stockProducts] = await Promise.all([
        api.get<any[]>('/orders'),
        api.get<any[]>('/inventory/stock'),
      ]);
      // Active orders needing dispatch
      const dispatchable = (allOrders || []).filter(
        (o: any) => o.status === 'CONFIRMED' || o.status === 'PACKED' || o.status === 'DISPATCHED'
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

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const [orderData, serialsData] = await Promise.all([
        api.get<any>(`/orders/${orderId}`),
        api.get<any[]>(`/dispatch/serials?order_id=${orderId}`),
      ]);
      setSelectedOrder(orderData);
      setScannedItems(serialsData || []);
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
      <ControlPanel breadcrumbs={[{ label: 'Warehouse Dispatch & Barcode Scanning' }]} />

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Select Order */}
        <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faTruck} className="text-odoo-primary" />
            <span>Orders Ready for Dispatch</span>
          </h2>

          {orders.length === 0 ? (
            <div className="text-xs text-gray-400 py-6 text-center">
              No orders pending dispatch right now.
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
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">
                      {o.status}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">
                    {o.customer_name || `Customer #${o.customer_id}`} • {o.capacity_kw} kW {o.system_type}
                  </div>
                  <div className="text-odoo-primary font-semibold mt-1">
                    ₹{o.total_amount?.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Scanning Terminal */}
        <div className="bg-white rounded border border-odoo-border shadow-xs p-5 lg:col-span-2">
          {selectedOrder ? (
            <div>
              <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-5">
                <div>
                  <span className="text-xs uppercase text-gray-400 font-bold">Fulfillment Target</span>
                  <h1 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h1>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {selectedOrder.customer_name} • {selectedOrder.capacity_kw} kW {selectedOrder.system_type}
                  </p>
                </div>

                <button
                  onClick={handleConfirmDelivery}
                  disabled={isDelivering || selectedOrder.status === 'DELIVERED'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded text-xs shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>
                    {selectedOrder.status === 'DELIVERED'
                      ? 'Delivery Confirmed'
                      : isDelivering
                      ? 'Validating Gate...'
                      : 'Confirm Delivery (Enforce Gate)'}
                  </span>
                </button>
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

              {/* Scanning Input Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faBarcode} className="text-odoo-primary" />
                  <span>Serial Item Barcode Scanner</span>
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
                          <th className="py-2 px-3">Delivered On</th>
                          <th className="py-2 px-3">Warranty Expiration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {scannedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-bold text-odoo-primary">{item.serial_no}</td>
                            <td className="py-2 px-3 font-sans text-gray-800">{item.product_name}</td>
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
                              {item.delivered_on
                                ? new Date(item.delivered_on).toLocaleDateString()
                                : 'Pending Delivery'}
                            </td>
                            <td className="py-2 px-3 font-sans font-semibold text-emerald-700">
                              {item.warranty_end
                                ? new Date(item.warranty_end).toLocaleDateString()
                                : 'Auto on Delivery'}
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
    </div>
  );
};
