import React, { useEffect, useState, useRef } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { ListView } from '../../components/odoo/ListView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxes,
  faExclamationTriangle,
  faDolly,
  faCheck,
  faListCheck,
  faBarcode,
  faCamera,
  faCheckCircle,
  faPlus,
  faMinus,
  faRotateLeft,
  faCheckDouble,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const InventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'stock' ? 'stock' : 'picklists';
  const [activeTab, setActiveTab] = useState<'stock' | 'picklists'>(initialTab);
  const [products, setProducts] = useState<any[]>([]);
  const [pickLists, setPickLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Interactive Checklist & Barcode Scanning Modal for Pick Lists
  const [selectedPickList, setSelectedPickList] = useState<any | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanningCamera, setScanningCamera] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Purchase modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [purchaseRef, setPurchaseRef] = useState('');
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  const fetchData = async () => {
    try {
      const [prodsData, picksData] = await Promise.all([
        api.get<any[]>(`/inventory/stock?low_stock_only=${lowStockOnly}`),
        api.get<any[]>('/inventory/pick-lists'),
      ]);
      setProducts(prodsData || []);
      setPickLists(picksData || []);
      if (prodsData && prodsData.length > 0 && selectedProductId === 0) {
        setSelectedProductId(prodsData[0].id);
        setPurchaseCost(prodsData[0].cost_price || 0);
      }

      // Check if URL specifies a pick_list_id to open automatically
      const pickIdParam = searchParams.get('pick_list_id');
      if (pickIdParam && picksData) {
        const match = picksData.find((p: any) => String(p.id) === pickIdParam);
        if (match) {
          setSelectedPickList(match);
          setActiveTab('picklists');
        }
      }
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['order.', 'serial.', 'stock.'], fetchData);

  useEffect(() => {
    fetchData();
  }, [lowStockOnly, searchParams]);

  // Camera scanner effect for PickList modal
  useEffect(() => {
    if (scanningCamera && selectedPickList) {
      const scanner = new Html5QrcodeScanner(
        'picklist-barcode-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (decodedText) => {
          handleScanCode(decodedText);
          setScanningCamera(false);
          scanner.clear().catch(() => {});
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
  }, [scanningCamera, selectedPickList]);

  const handleInwardPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPurchase(true);
      await api.post('/inventory/purchases', {
        product_id: Number(selectedProductId),
        quantity: Number(purchaseQty),
        unit_cost: Number(purchaseCost),
        reference_no: purchaseRef || 'PO-MANUAL',
        movement_type: 'PURCHASE',
      });
      setShowPurchaseModal(false);
      setPurchaseRef('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase');
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const handleToggleLinePick = async (lineId: number, currentPicked: number, required: number) => {
    if (!selectedPickList) return;
    try {
      const newQty = currentPicked >= required ? 0 : required;
      const updated = await api.put<any>(
        `/inventory/pick-lists/${selectedPickList.id}/lines/${lineId}/pick?qty=${newQty}`
      );
      setSelectedPickList(updated);
      setPickLists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err.message || 'Failed to update item check' });
    }
  };

  const handleAdjustQty = async (lineId: number, delta: number) => {
    if (!selectedPickList) return;
    const line = selectedPickList.lines?.find((l: any) => l.id === lineId);
    if (!line) return;
    const newQty = Math.max(0, Math.min(line.required_qty, (line.picked_qty || 0) + delta));
    try {
      const updated = await api.put<any>(
        `/inventory/pick-lists/${selectedPickList.id}/lines/${lineId}/pick?qty=${newQty}`
      );
      setSelectedPickList(updated);
      setPickLists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err.message || 'Failed to adjust qty' });
    }
  };

  const handleScanCode = async (rawCode?: string) => {
    if (!selectedPickList) return;
    const code = (rawCode || barcodeInput).trim();
    if (!code) return;
    try {
      const updated = await api.post<any>(`/inventory/pick-lists/${selectedPickList.id}/scan`, { code });
      setSelectedPickList(updated);
      setPickLists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setScanMessage({
        type: 'success',
        text: `✓ Successfully scanned and verified item [${code}]! Checklist updated.`,
      });
      setBarcodeInput('');
    } catch (err: any) {
      setScanMessage({
        type: 'error',
        text: err.message || `No item matching barcode/SKU '${code}' in this installation checklist.`,
      });
    }
  };

  const handleTickAllItems = async () => {
    if (!selectedPickList || !selectedPickList.lines) return;
    try {
      let current = selectedPickList;
      for (const line of selectedPickList.lines) {
        if (line.picked_qty < line.required_qty) {
          current = await api.put<any>(
            `/inventory/pick-lists/${selectedPickList.id}/lines/${line.id}/pick?qty=${line.required_qty}`
          );
        }
      }
      setSelectedPickList(current);
      setPickLists((prev) => prev.map((p) => (p.id === current.id ? current : p)));
      setScanMessage({ type: 'success', text: 'All installation items marked as verified & picked!' });
    } catch (err: any) {
      alert(err.message || 'Failed to tick all items');
    }
  };

  const handlePackAndPlaceOrder = async (pickListId: number) => {
    try {
      const updated = await api.put<any>(`/inventory/pick-lists/${pickListId}/pack`);
      setSelectedPickList(null);
      fetchData();
      alert(`✓ Installation checklist completed! Order has been placed into PACKED status and warehouse stock deducted.`);
    } catch (err: any) {
      alert(err.message || 'Failed to pack pick list');
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  const lowStockCount = products.filter((p) => p.stock_quantity <= p.min_stock_alert).length;

  const stockColumns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (row: any) => <span className="font-mono font-medium text-gray-700">{row.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product Name',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-gray-900">{row.name}</span>
          {row.is_serialised && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-medium">
              Serialised
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row: any) => row.category,
    },
    {
      key: 'stock_quantity',
      header: 'On Hand',
      render: (row: any) => {
        const isLow = row.stock_quantity <= row.min_stock_alert;
        return (
          <div className="flex items-center space-x-1.5">
            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
              {row.stock_quantity} {row.uom || 'units'}
            </span>
            {isLow && (
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="text-red-500 text-xs"
                title="Low stock alert"
              />
            )}
          </div>
        );
      },
    },
    {
      key: 'min_stock_alert',
      header: 'Min Alert',
      render: (row: any) => `${row.min_stock_alert} ${row.uom || 'units'}`,
    },
    {
      key: 'cost_price',
      header: 'Cost Price',
      render: (row: any) => `₹${row.cost_price?.toLocaleString()}`,
    },
    {
      key: 'sale_price',
      header: 'Sale Price',
      render: (row: any) => `₹${row.sale_price?.toLocaleString()}`,
    },
    {
      key: 'warranty_years',
      header: 'Warranty',
      render: (row: any) => `${row.warranty_years} yrs`,
    },
  ];

  const pickListColumns = [
    {
      key: 'pick_list_number',
      header: 'Pick List #',
      render: (row: any) => (
        <span className="font-mono font-bold text-odoo-primary">
          PL-{String(row.id).padStart(4, '0')}
        </span>
      ),
    },
    {
      key: 'order_id',
      header: 'Order & Customer',
      render: (row: any) => (
        <div>
          <span className="font-bold text-gray-900">{row.order_number || `Order #${row.order_id}`}</span>
          {row.customer_name && (
            <span className="block text-[11px] text-gray-600 font-medium">{row.customer_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'items_list',
      header: 'Required Installation Items Sent by Sales',
      render: (row: any) => {
        const lines = row.lines || row.items || [];
        if (lines.length === 0) {
          return <span className="text-gray-400 italic">No hardware items</span>;
        }
        return (
          <div className="space-y-1 py-1 max-w-md">
            <span className="inline-block bg-purple-100 text-[#6B4B63] px-1.5 py-0.5 rounded text-[10px] font-bold">
              {lines.length} Installation Items
            </span>
            <ul className="space-y-0.5 text-[11px] text-gray-700">
              {lines.map((l: any, idx: number) => (
                <li key={l.id || idx} className="flex items-center gap-1.5">
                  <span className="font-bold text-[#6B4B63] shrink-0">{l.required_qty}x</span>
                  <span className="truncate">{l.product?.name || `Product #${l.product_id}`}</span>
                  {l.product?.sku && (
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">[{l.product.sku}]</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.status === 'PACKED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Checklist Progress',
      render: (row: any) => {
        const lines = row.lines || row.items || [];
        const completedLines = lines.filter((l: any) => (l.picked_qty || 0) >= (l.required_qty || 1)).length;
        const totalLines = lines.length;
        const pct = totalLines > 0 ? Math.round((completedLines / totalLines) * 100) : 0;

        return (
          <div className="space-y-1.5 min-w-[160px]">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600 font-medium">
                {completedLines}/{totalLines} verified
              </span>
              <span className="font-bold text-odoo-primary">{pct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setSelectedPickList(row);
              setScanMessage(null);
            }}
            className="bg-[#6B4B63] hover:bg-[#583D51] text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-xs flex items-center gap-1 transition-colors"
          >
            <FontAwesomeIcon icon={faBarcode} />
            <span>{row.status === 'PACKED' ? 'View Checklist' : 'Pick & Scan Checklist'}</span>
          </button>
        </div>
      ),
    },
  ];

  // Checklist completion calculation for modal
  const modalLines = selectedPickList?.lines || [];
  const modalCompletedCount = modalLines.filter((l: any) => (l.picked_qty || 0) >= (l.required_qty || 1)).length;
  const modalAllCompleted = modalLines.length > 0 && modalCompletedCount === modalLines.length;
  const modalPct = modalLines.length > 0 ? Math.round((modalCompletedCount / modalLines.length) * 100) : 0;

  const pendingPickLists = pickLists.filter((pl) => pl.status === 'PENDING');
  const filteredPickLists = pickLists.filter((pl) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (pl.order_number && pl.order_number.toLowerCase().includes(term)) ||
      (pl.customer_name && pl.customer_name.toLowerCase().includes(term)) ||
      String(pl.id).includes(term) ||
      (pl.lines && pl.lines.some((l: any) => l.product?.name?.toLowerCase().includes(term) || l.product?.sku?.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Inventory & Warehouse' }]}
        onNew={() => setShowPurchaseModal(true)}
        newButtonLabel="Inward Stock"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Sales Orders & Items Dispatched from Sales Alert Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-purple-50/40 to-white border-b border-purple-200 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-bold bg-[#6B4B63] text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide flex items-center gap-1">
            <FontAwesomeIcon icon={faDolly} />
            <span>Items From Sales</span>
          </span>
          <span className="text-[#212529]">
            {pendingPickLists.length > 0 ? (
              <>
                <strong>{pendingPickLists.length} installation checklist{pendingPickLists.length > 1 ? 's' : ''}</strong> received from Sales Team awaiting warehouse verification and scanning.
              </>
            ) : (
              <>All sales installation checklists are verified and packed.</>
            )}
          </span>
        </div>
        {pendingPickLists[0] && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('picklists');
              setSelectedPickList(pendingPickLists[0]);
              setScanMessage(null);
            }}
            className="bg-[#6B4B63] hover:bg-[#583D51] text-white px-3 py-1 rounded font-bold text-xs shadow-xs transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>Scan Latest: {pendingPickLists[0].order_number} ({pendingPickLists[0].customer_name})</span>
            <FontAwesomeIcon icon={faBarcode} />
          </button>
        )}
      </div>

      {/* Tabs bar */}
      <div className="bg-white border-b border-gray-200 px-6 pt-3 flex items-center justify-between">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('picklists')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'picklists'
                ? 'border-odoo-primary text-odoo-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faListCheck} />
            <span>Items & Pick Lists ({pickLists.length})</span>
            {pendingPickLists.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                {pendingPickLists.length} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'stock'
                ? 'border-odoo-primary text-odoo-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faBoxes} />
            <span>Products & Stock Levels</span>
            {lowStockCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full text-[10px]">
                {lowStockCount} low
              </span>
            )}
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center space-x-2 pb-2">
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                lowStockOnly
                  ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 text-red-500" />
              Low Stock Alert ({lowStockCount})
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading warehouse data...</div>
        ) : activeTab === 'stock' ? (
          <ListView columns={stockColumns} data={filteredProducts} />
        ) : (
          <ListView
            columns={pickListColumns}
            data={filteredPickLists}
            onRowClick={(row) => {
              setSelectedPickList(row);
              setScanMessage(null);
            }}
          />
        )}
      </div>

      {/* Interactive Installation Pick List Checklist & Barcode Scanner Modal */}
      {selectedPickList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-purple-50 via-white to-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[#6B4B63]">
                    Pick List #{selectedPickList.id}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="font-semibold text-xs text-gray-800">
                    {selectedPickList.order_number || `Order #${selectedPickList.order_id}`}
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedPickList.status === 'PACKED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedPickList.status}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Pre-generated installation BOM checklist. Verify each item by scanning or ticking before placing order.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPickList(null);
                  setScanningCamera(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Checklist Progress Strip */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-700">
                    Checklist Verification Progress ({modalCompletedCount}/{modalLines.length} items ready)
                  </span>
                  <span className="font-bold text-[#6B4B63]">{modalPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      modalAllCompleted ? 'bg-emerald-600' : 'bg-[#6B4B63]'
                    }`}
                    style={{ width: `${modalPct}%` }}
                  ></div>
                </div>
              </div>

              {selectedPickList.status !== 'PACKED' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTickAllItems}
                    className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <FontAwesomeIcon icon={faCheckDouble} className="text-emerald-600" />
                    <span>Tick All</span>
                  </button>
                </div>
              )}
            </div>

            {/* Barcode & SKU Scanner Area */}
            {selectedPickList.status !== 'PACKED' && (
              <div className="px-5 py-3 border-b border-gray-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleScanCode();
                  }}
                  className="flex flex-col sm:flex-row items-center gap-2"
                >
                  <div className="relative flex-1 w-full">
                    <FontAwesomeIcon
                      icon={faBarcode}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Scan or type product barcode / SKU (e.g. SP-PNL-540W or serial)..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#6B4B63] font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-[#6B4B63] hover:bg-[#583D51] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                    >
                      Scan Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanningCamera(!scanningCamera)}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        scanningCamera
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCamera} />
                      <span>{scanningCamera ? 'Close Camera' : 'Camera'}</span>
                    </button>
                  </div>
                </form>

                {/* Camera Scanner Viewport */}
                {scanningCamera && (
                  <div className="mt-3 p-3 bg-gray-900 rounded-lg text-center">
                    <div id="picklist-barcode-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded"></div>
                    <div className="text-[11px] text-gray-300 mt-2">
                      Point camera at 1D Barcode or QR code on item package / label.
                    </div>
                  </div>
                )}

                {/* Scan Feedback Message */}
                {scanMessage && (
                  <div
                    className={`mt-2 p-2 rounded text-xs flex items-center justify-between ${
                      scanMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    <span>{scanMessage.text}</span>
                    <button
                      type="button"
                      onClick={() => setScanMessage(null)}
                      className="text-gray-400 hover:text-gray-600 font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Checklist Items Table */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">Tick</th>
                    <th className="py-2.5 px-3">Item Specification & SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center w-24">Required</th>
                    <th className="py-2.5 px-3 text-center w-36">Picked / Scanned</th>
                    <th className="py-2.5 px-3 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalLines.map((line: any) => {
                    const req = line.required_qty || 1;
                    const picked = line.picked_qty || 0;
                    const isCompleted = picked >= req;
                    const pName = line.product?.name || `Product #${line.product_id}`;
                    const pSku = line.product?.sku || 'SKU-N/A';
                    const pCat = line.product?.category || 'BOS';

                    return (
                      <tr
                        key={line.id}
                        className={`transition-colors ${
                          isCompleted ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-purple-50/30'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          {selectedPickList.status === 'PACKED' ? (
                            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-base" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleLinePick(line.id, picked, req)}
                              className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'border-2 border-gray-300 hover:border-[#6B4B63] text-transparent hover:text-gray-400'
                              }`}
                              title={isCompleted ? 'Click to untick' : 'Click to tick/pick item'}
                            >
                              <FontAwesomeIcon icon={faCheck} className="text-xs" />
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900 leading-tight">{pName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                              {pSku}
                            </span>
                            {line.product?.is_serialised && (
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.2 rounded">
                                Serialised
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 capitalize">{pCat}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">{req}</td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedPickList.status === 'PACKED' ? (
                            <span className="font-bold text-emerald-800">{picked}</span>
                          ) : (
                            <div className="inline-flex items-center border border-gray-300 rounded bg-white">
                              <button
                                type="button"
                                onClick={() => handleAdjustQty(line.id, -1)}
                                className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded-l"
                              >
                                <FontAwesomeIcon icon={faMinus} className="text-[10px]" />
                              </button>
                              <span className="px-2 py-0.5 font-bold text-xs min-w-[28px] text-center">
                                {picked}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdjustQty(line.id, 1)}
                                className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded-r"
                              >
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCompleted ? '✓ PICKED' : `${req - picked} NEEDED`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-gray-500 text-[11px]">
                {modalAllCompleted ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span>All items in installation checklist verified! Ready to place order.</span>
                  </span>
                ) : (
                  <span>
                    Tick or scan remaining items to unlock order placement and dispatch confirmation.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPickList(null);
                    setScanningCamera(false);
                  }}
                  className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg font-medium"
                >
                  Close
                </button>

                {selectedPickList.status !== 'PACKED' && (
                  <button
                    type="button"
                    onClick={() => handlePackAndPlaceOrder(selectedPickList.id)}
                    disabled={!modalAllCompleted}
                    className={`px-4 py-2 rounded-lg font-bold text-white shadow-xs flex items-center gap-1.5 transition-all ${
                      modalAllCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 cursor-pointer'
                        : 'bg-gray-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Confirm Checklist & Place Order (Mark Packed)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inward Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faDolly} className="text-odoo-primary" />
                <span>Inward Stock Purchase</span>
              </h3>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInwardPurchase} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    setSelectedProductId(pid);
                    const p = products.find((x) => x.id === pid);
                    if (p) setPurchaseCost(p.cost_price || 0);
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Current: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Quantity Inward <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Unit Cost (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">PO / Supplier Invoice Ref</label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-0042 / Luminous Inv #881"
                  value={purchaseRef}
                  onChange={(e) => setPurchaseRef(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPurchase}
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-medium shadow-xs disabled:opacity-50"
                >
                  {submittingPurchase ? 'Adding...' : 'Confirm Inward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
