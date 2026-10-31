import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { ListView } from '../../components/odoo/ListView';
import { KanbanView, KanbanColumn, KanbanItem } from '../../components/odoo/KanbanView';

interface OrderItem {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name?: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  status: string;
  capacity_kw: number;
  system_type: string;
  created_at: string;
}

const ORDER_COLUMNS: KanbanColumn[] = [
  { id: 'DRAFT', title: 'Draft', color: 'bg-gray-400' },
  { id: 'CONFIRMED', title: 'Confirmed', color: 'bg-blue-500' },
  { id: 'PACKED', title: 'Packed', color: 'bg-amber-500' },
  { id: 'DISPATCHED', title: 'Dispatched', color: 'bg-purple-500' },
  { id: 'DELIVERED', title: 'Delivered', color: 'bg-cyan-500' },
  { id: 'INSTALLED', title: 'Installed', color: 'bg-emerald-500' },
  { id: 'CLOSED', title: 'Closed', color: 'bg-slate-700' },
];

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get<OrderItem[]>('/orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(term) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
      o.system_type.toLowerCase().includes(term) ||
      o.status.toLowerCase().includes(term)
    );
  });

  const kanbanItems: KanbanItem[] = filteredOrders.map((o) => ({
    id: o.id,
    columnId: o.status,
    title: o.order_number,
    subtitle: o.customer_name ? `${o.customer_name} • ${o.capacity_kw} kW ${o.system_type}` : `${o.capacity_kw} kW ${o.system_type}`,
    amount: o.total_amount,
    tags: [
      {
        label: o.payment_status,
        color: o.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : o.payment_status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800',
      },
    ],
  }));

  const columns = [
    {
      key: 'order_number',
      header: 'Order #',
      accessor: (row: OrderItem) => (
        <span className="font-semibold text-odoo-primary hover:underline">{row.order_number}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (row: OrderItem) => row.customer_name || `Customer #${row.customer_id}`,
    },
    {
      key: 'system',
      header: 'System',
      accessor: (row: OrderItem) => `${row.capacity_kw} kW ${row.system_type}`,
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      accessor: (row: OrderItem) => `₹${row.total_amount.toLocaleString()}`,
    },
    {
      key: 'paid_amount',
      header: 'Paid Amount',
      accessor: (row: OrderItem) => `₹${row.paid_amount.toLocaleString()}`,
    },
    {
      key: 'payment_status',
      header: 'Payment Status',
      accessor: (row: OrderItem) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            row.payment_status === 'PAID'
              ? 'bg-emerald-100 text-emerald-800'
              : row.payment_status === 'PARTIAL'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.payment_status}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stage',
      accessor: (row: OrderItem) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Sales Orders' }]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v as 'kanban' | 'list')}
        availableViews={['kanban', 'list']}
      />

      <div className="flex-1 p-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Loading orders...</div>
        ) : currentView === 'kanban' ? (
          <KanbanView
            columns={ORDER_COLUMNS}
            items={kanbanItems}
            onItemClick={(item) => navigate(`/web/orders/${item.id}`)}
          />
        ) : (
          <ListView
            columns={columns}
            data={filteredOrders}
            onRowClick={(row) => navigate(`/web/orders/${row.id}`)}
          />
        )}
      </div>
    </div>
  );
};
