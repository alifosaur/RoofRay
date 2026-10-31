import React, { useEffect, useState } from 'react';
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
} from '@fortawesome/free-solid-svg-icons';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'picklists'>('stock');
  const [products, setProducts] = useState<any[]>([]);
  const [pickLists, setPickLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Purchase modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [purchaseRef, setPurchaseRef] = useState('');
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodsData, picksData] = await Promise.all([
        api.get<any[]>(`/inventory/stock?low_stock_only=${lowStockOnly}`),
        api.get<any[]>('/inventory/pick-lists'),
      ]);
      setProducts(prodsData);
      setPickLists(picksData);
      if (prodsData.length > 0 && selectedProductId === 0) {
        setSelectedProductId(prodsData[0].id);
        setPurchaseCost(prodsData[0].cost_price || 0);
      }
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lowStockOnly]);

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

  const handlePackPickList = async (pickListId: number) => {
    try {
      await api.put(`/inventory/pick-lists/${pickListId}/pack`);
      fetchData();
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
      accessor: (row: any) => <span className="font-mono font-medium text-gray-700">{row.sku}</span>,
    },
    {
      key: 'name',
      header: 'Product Name',
      accessor: (row: any) => (
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
      accessor: (row: any) => row.category,
    },
    {
      key: 'stock_quantity',
      header: 'On Hand',
      accessor: (row: any) => {
        const isLow = row.stock_quantity <= row.min_stock_alert;
        return (
          <div className="flex items-center space-x-1.5">
            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
              {row.stock_quantity} {row.uom}
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
      accessor: (row: any) => `${row.min_stock_alert} ${row.uom}`,
    },
    {
      key: 'cost_price',
      header: 'Cost Price',
      accessor: (row: any) => `₹${row.cost_price?.toLocaleString()}`,
    },
    {
      key: 'sale_price',
      header: 'Sale Price',
      accessor: (row: any) => `₹${row.sale_price?.toLocaleString()}`,
    },
    {
      key: 'warranty_years',
      header: 'Warranty',
      accessor: (row: any) => `${row.warranty_years} yrs`,
    },
  ];

  const pickListColumns = [
    {
      key: 'pick_list_number',
      header: 'Pick List #',
      accessor: (row: any) => (
        <span className="font-mono font-bold text-odoo-primary">{row.pick_list_number}</span>
      ),
    },
    {
      key: 'order_id',
      header: 'Order #',
      accessor: (row: any) => `Order #${row.order_id}`,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: any) => (
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
      key: 'items',
      header: 'Items to Pick',
      accessor: (row: any) => (
        <div className="space-y-1">
          {row.items?.map((item: any, idx: number) => (
            <div key={idx} className="text-[11px] text-gray-700">
              <span className="font-medium">{item.product_name}</span>: {item.quantity_required} req.
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      accessor: (row: any) =>
        row.status === 'PENDING' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePackPickList(row.id);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-medium shadow-xs flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faCheck} />
            <span>Mark Packed</span>
          </button>
        ) : (
          <span className="text-gray-400 text-xs italic">Packed & Ready</span>
        ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Inventory & Warehouse' }]}
        onNew={() => setShowPurchaseModal(true)}
        newButtonLabel="Inward Stock"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Tabs bar */}
      <div className="bg-white border-b border-gray-200 px-6 pt-3 flex items-center justify-between">
        <div className="flex space-x-6">
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

          <button
            onClick={() => setActiveTab('picklists')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'picklists'
                ? 'border-odoo-primary text-odoo-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faListCheck} />
            <span>Warehouse Pick Lists ({pickLists.length})</span>
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
          <ListView columns={pickListColumns} data={pickLists} />
        )}
      </div>

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
