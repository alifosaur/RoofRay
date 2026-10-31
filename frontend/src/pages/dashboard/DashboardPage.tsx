import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie,
  faMoneyBillWave,
  faExclamationTriangle,
  faFileExcel,
  faShareAlt,
  faTools,
} from '@fortawesome/free-solid-svg-icons';

const PIE_COLORS = ['#714B67', '#017E84', '#F59E0B', '#EF4444', '#3B82F6', '#10B981'];

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');

  const [range, setRange] = useState<'today' | 'this_week' | 'this_month' | 'all'>('this_month');
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [profitJobs, setProfitJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (shareToken) {
        // Read-only public share view
        const data = await api.get<any>(`/reports/shared/${shareToken}?range=${range}`);
        setDashboard(data);
      } else {
        const [dashData, profitData] = await Promise.all([
          api.get<any>(`/reports/dashboard?range=${range}`),
          api.get<any[]>(`/reports/profit-per-job?range=${range}`),
        ]);
        setDashboard(dashData);
        setProfitJobs(profitData || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [range, shareToken]);

  const handleExportExcel = () => {
    window.open('/api/reports/export.xlsx', '_blank');
  };

  const handleGenerateShareLink = async () => {
    try {
      const res = await api.post<any>('/reports/share-link', { expires_days: 7 });
      const fullUrl = `${window.location.origin}${res.shareable_url}`;
      setShareableUrl(fullUrl);
      setShowShareModal(true);
      setCopied(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create share link');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !dashboard) {
    return (
      <div className="flex-1 p-8 text-center text-gray-500 text-sm">
        Calculating executive metrics...
      </div>
    );
  }

  const financialOverviewData = dashboard
    ? [
        {
          name: 'Revenue & Cash',
          Billed: dashboard.total_revenue || 0,
          Collected: dashboard.collected_revenue || 0,
          Pending: dashboard.pending_revenue || 0,
          NetProfit: dashboard.net_profit || 0,
        },
      ]
    : [];

  const stageBreakdown = dashboard?.unfinished_jobs_by_stage
    ? Object.entries(dashboard.unfinished_jobs_by_stage).map(([stage, count]) => ({
        name: stage,
        value: count,
      }))
    : [];

  return (
    <div className="flex-1 flex flex-col bg-odoo-bg">
      <ControlPanel
        breadcrumbs={[{ label: shareToken ? 'Director Dashboard (Executive View)' : 'Director Dashboard' }]}
        actions={
          <div className="flex items-center space-x-2">
            {/* Range filters */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded border border-odoo-border">
              {(['today', 'this_week', 'this_month', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                    range === r
                      ? 'bg-white text-odoo-primary shadow-xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>

            {!shareToken && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <FontAwesomeIcon icon={faFileExcel} />
                  <span>Excel Export</span>
                </button>

                <button
                  onClick={handleGenerateShareLink}
                  className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <FontAwesomeIcon icon={faShareAlt} />
                  <span>Share View</span>
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Total Revenue</span>
            <div className="text-lg font-bold text-odoo-primary mt-1">
              ₹{dashboard?.total_revenue?.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Collected</span>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              ₹{dashboard?.collected_revenue?.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Pending Due</span>
            <div className="text-lg font-bold text-amber-600 mt-1">
              ₹{dashboard?.pending_revenue?.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Net Profit</span>
            <div className="text-lg font-bold text-teal-800 mt-1">
              ₹{dashboard?.net_profit?.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
              Margin: {dashboard?.profit_margin_percent}%
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Jobs P / L</span>
            <div className="text-sm font-bold text-gray-800 mt-1 flex items-center gap-1">
              <span className="text-emerald-600">{dashboard?.profitable_jobs_count} Prof</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-500">{dashboard?.loss_making_jobs_count} Loss</span>
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Open Tickets</span>
            <div className="text-lg font-bold text-rose-600 mt-1">
              {dashboard?.open_tickets_count}
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Low Stock SKUs</span>
            <div className="text-lg font-bold text-amber-600 mt-1 flex items-center gap-1.5">
              <span>{dashboard?.low_stock_products_count}</span>
              {dashboard?.low_stock_products_count > 0 && (
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs text-amber-500" />
              )}
            </div>
          </div>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Costs vs Profit */}
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-odoo-primary" />
              <span>Financial Waterfall (₹)</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialOverviewData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Billed" fill="#714B67" name="Billed Revenue" />
                  <Bar dataKey="Collected" fill="#017E84" name="Collected Cash" />
                  <Bar dataKey="Pending" fill="#F59E0B" name="Receivables Pending" />
                  <Bar dataKey="NetProfit" fill="#10B981" name="Gross Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Job Pipeline Stages Pie */}
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faTools} className="text-teal-600" />
              <span>Unfinished Job Stages</span>
            </h3>
            <div className="h-64 flex items-center justify-center">
              {stageBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {stageBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400">All scheduled jobs completed!</div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Profit Per Job Table */}
        {!shareToken && (
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartPie} className="text-odoo-primary" />
              <span>Profit Per Job Analysis (Revenue − BOM Stock Costs − Crew Wages)</span>
            </h3>

            {profitJobs.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                No orders completed within this time range.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Revenue</th>
                      <th className="py-2.5 px-3 text-right">Hardware Stock Cost</th>
                      <th className="py-2.5 px-3 text-right">Technician Labor</th>
                      <th className="py-2.5 px-3 text-right">Net Margin (₹)</th>
                      <th className="py-2.5 px-3 text-right">Margin %</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profitJobs.map((job) => (
                      <tr key={job.order_id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-odoo-primary">
                          {job.order_number}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{job.customer_name}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          ₹{job.revenue?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          ₹{job.stock_cost?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          ₹{job.technician_cost?.toLocaleString()} ({job.technician_hours}h)
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            job.profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          ₹{job.profit?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {job.profit_margin_percent}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              job.is_profitable
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {job.is_profitable ? 'PROFIT' : 'LOSS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">Expiring Executive Share Link</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-600">
                This link allows stakeholders and directors to access a secure, read-only view of executive metrics without logging in. Valid for 7 days.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="flex-1 bg-gray-50 border border-gray-300 rounded px-3 py-1.5 font-mono text-[11px] text-gray-800 select-all"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-3 py-1.5 rounded font-bold transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
