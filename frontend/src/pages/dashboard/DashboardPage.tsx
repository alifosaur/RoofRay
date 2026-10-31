import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, downloadFile } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import {
  LineChart,
  Line,
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
  faChartLine,
  faMoneyBillWave,
  faExclamationTriangle,
  faFileExcel,
  faShareAlt,
  faTools,
  faEye,
  faUser,
  faBoxes,
  faCheckCircle,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';

const PIE_COLORS = ['#714B67', '#017E84', '#F59E0B', '#EF4444', '#3B82F6', '#10B981'];

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  const navigate = useNavigate();

  const [range, setRange] = useState<'today' | 'this_week' | 'this_month' | 'all'>('this_month');
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [profitJobs, setProfitJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected job for detailed admin modal
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchDashboardData = async () => {
    try {
      if (!dashboard) setLoading(true);
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
    // Live view: poll every 30s and refresh when the tab regains focus
    const interval = setInterval(fetchDashboardData, 30000);
    window.addEventListener('focus', fetchDashboardData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchDashboardData);
    };
  }, [range, shareToken]);

  const handleExportExcel = () => {
    downloadFile('/reports/export.xlsx', 'RoofRay_Executive_Report.xlsx').catch((err) =>
      alert(err.message || 'Failed to export report')
    );
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

  // Financial Trend Line Chart Data
  const financialTrendData = (dashboard?.trend_points || []).map((tp: any) => ({
    name: tp.date || tp.name,
    Billed: tp.revenue,
    Collected: tp.collected,
    Costs: tp.costs,
    NetProfit: tp.net_profit,
  }));

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
              ₹{(dashboard?.total_revenue ?? dashboard?.revenue)?.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Collected</span>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              ₹{(dashboard?.collected_revenue ?? dashboard?.collected_payments)?.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded border border-odoo-border shadow-xs p-3.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Pending Due</span>
            <div className="text-lg font-bold text-amber-600 mt-1">
              ₹{(dashboard?.pending_revenue ?? dashboard?.pending_payments)?.toLocaleString()}
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
              <span>{dashboard?.low_stock_products_count ?? dashboard?.low_stock_count}</span>
              {(dashboard?.low_stock_products_count ?? dashboard?.low_stock_count) > 0 && (
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs text-amber-500" />
              )}
            </div>
          </div>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Costs vs Profit - LINE GRAPH */}
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-[#6B4B63]" />
              <span>Financial Performance Trend Line (Revenue, Cash, Costs & Profit)</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6C757D' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6C757D' }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="Billed"
                    name="Billed Revenue"
                    stroke="#6B4B63"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6B4B63' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Collected"
                    name="Collected Cash"
                    stroke="#017E84"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#017E84' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Costs"
                    name="Direct Costs"
                    stroke="#F59E0B"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#F59E0B' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="NetProfit"
                    name="Net Profit"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10B981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
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

        {/* Detailed Profit Per Job Table matching Screenshot */}
        {!shareToken && (
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faChartPie} className="text-odoo-primary" />
                <span>Profit Per Job Analysis (Revenue − BOM Stock Costs − Crew Wages)</span>
              </h3>
              <span className="text-[11px] text-gray-500">
                Click any row or tap <strong>Details</strong> to view complete order breakdown
              </span>
            </div>

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
                      <th className="py-2.5 px-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profitJobs.map((job) => {
                      const netProfit = job.net_profit ?? job.profit ?? 0;
                      const marginPct = job.margin_pct ?? job.profit_margin_percent ?? 0;
                      const techHours = job.technician_hours ?? 0;
                      const techCost = job.technician_cost ?? 0;

                      return (
                        <tr
                          key={job.order_id}
                          className="hover:bg-purple-50/40 cursor-pointer transition-colors group"
                          onClick={() => setSelectedJob(job)}
                        >
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
                            ₹{techCost?.toLocaleString()} ({techHours}h)
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            ₹{netProfit?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            {marginPct}%
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
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedJob(job)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#6B4B63] hover:bg-[#583D51] text-white text-[11px] font-bold shadow-xs transition-colors"
                            >
                              <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* COMPREHENSIVE JOB DETAILS MODAL (EVERY DETAIL SHOWN TO ADMIN) */}
      {/* ============================================================== */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-odoo-border w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#6B4B63] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/10 rounded-lg text-lg">☀️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-wide">
                      Order Details: {selectedJob.order_number}
                    </h3>
                    <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                      {selectedJob.order_status}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedJob.customer_name} • {selectedJob.capacity_kw} kW {selectedJob.system_type || 'On-Grid'} Solar System
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-white/80 hover:text-white p-1 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-[#212529]">
              {/* Section 1: Financial & P&L Cards */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="text-[#6B4B63]" />
                  <span>Financial Ledger & Profitability (Revenue − BOM − Wages − Logistics)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-200">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase">Revenue Billed</span>
                    <span className="text-sm font-bold text-[#6B4B63] mt-1 block">
                      ₹{selectedJob.revenue?.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase">Collected Cash</span>
                    <span className="text-sm font-bold text-emerald-700 mt-1 block">
                      ₹{(selectedJob.paid_amount ?? selectedJob.revenue)?.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase">Pending Balance</span>
                    <span className="text-sm font-bold text-amber-700 mt-1 block">
                      ₹{(selectedJob.pending_amount ?? 0)?.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase">Hardware BOM Cost</span>
                    <span className="text-sm font-bold text-gray-800 mt-1 block">
                      ₹{selectedJob.stock_cost?.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase">Technician Labor</span>
                    <span className="text-sm font-bold text-gray-800 mt-1 block">
                      ₹{selectedJob.technician_cost?.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-gray-500">
                      Logged: {selectedJob.technician_hours || 0} hrs
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 block font-bold uppercase">Logistics & Freight</span>
                    <span className="text-sm font-bold text-gray-800 mt-1 block">
                      ₹{(selectedJob.other_costs ?? Math.round(selectedJob.revenue * 0.04))?.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-gray-500">4% Transport allocation</span>
                  </div>
                </div>

                {/* Net Profit Summary Banner */}
                <div className={`mt-3 p-3.5 rounded-lg border flex items-center justify-between ${
                  (selectedJob.net_profit ?? selectedJob.profit) >= 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-sm" />
                    <div>
                      <span className="font-bold text-xs uppercase tracking-wide">
                        {(selectedJob.net_profit ?? selectedJob.profit) >= 0 ? 'Profitable Project' : 'Loss-Making Project'}
                      </span>
                      <span className="text-[11px] block opacity-80">
                        Total Direct Delivery Costs: ₹{selectedJob.total_costs?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold block">
                      ₹{(selectedJob.net_profit ?? selectedJob.profit)?.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold">
                      Net Margin: {selectedJob.margin_pct ?? selectedJob.profit_margin_percent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Customer & Installation Site */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUser} className="text-[#6B4B63]" />
                  <span>Customer & Installation Site Profile</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/80 rounded-lg border border-gray-200">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Customer Full Name</span>
                    <span className="font-bold text-gray-900 text-xs mt-0.5 block">{selectedJob.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Contact Phone</span>
                    <span className="font-semibold text-gray-800 text-xs mt-0.5 block">{selectedJob.customer_phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Email Address</span>
                    <span className="font-semibold text-gray-800 text-xs mt-0.5 block">{selectedJob.customer_email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">System Specification</span>
                    <span className="font-bold text-[#6B4B63] text-xs mt-0.5 block">{selectedJob.capacity_kw} kW {selectedJob.system_type || 'On-Grid'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Installation Rooftop Address</span>
                    <span className="text-gray-800 text-xs mt-0.5 block">{selectedJob.customer_address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">City / Pincode</span>
                    <span className="text-gray-800 text-xs mt-0.5 block">{[selectedJob.customer_city, selectedJob.customer_pincode].filter(Boolean).join(' - ') || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Field Crew Lead</span>
                    <span className="font-semibold text-gray-900 text-xs mt-0.5 block">{selectedJob.technician_name || 'Not Assigned'}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Bill of Materials (BOM) Hardware Items */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faBoxes} className="text-[#6B4B63]" />
                  <span>Bill of Materials (BOM) & Inventory Hardware Delivered</span>
                </h4>
                {selectedJob.bom_items && selectedJob.bom_items.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Item / Specification</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Cost</th>
                          <th className="py-2 px-3 text-right">Unit Billed</th>
                          <th className="py-2 px-3 text-right">Total Cost</th>
                          <th className="py-2 px-3 text-right">Total Billed</th>
                          <th className="py-2 px-3 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedJob.bom_items.map((item: any, idx: number) => {
                          const itemProfit = item.total_price - item.total_cost;
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                {item.product_name}
                                {item.warranty_years > 0 && (
                                  <span className="block text-[10px] text-gray-400 font-normal">
                                    {item.warranty_years} Years Performance Warranty
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-gray-500 text-[10px]">{item.sku}</td>
                              <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                              <td className="py-2 px-3 text-right text-gray-600">₹{item.unit_cost?.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-medium">₹{item.unit_price?.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right text-gray-600">₹{item.total_cost?.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-semibold text-gray-900">₹{item.total_price?.toLocaleString()}</td>
                              <td className={`py-2 px-3 text-right font-bold ${itemProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                +₹{itemProfit?.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-xs">
                    No BOM lines on this order's quote.
                  </div>
                )}
              </div>

              {/* Section 4: Serial Numbers Tracked & Subsidy Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-5">
                {/* Serials */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                    Hardware Serial Tracking
                  </h4>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    {selectedJob.serials && selectedJob.serials.length > 0 ? (
                      selectedJob.serials.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-200 pb-1.5 last:border-0 last:pb-0">
                          <div>
                            <span className="font-mono font-bold text-odoo-primary block">{s.serial_number}</span>
                            <span className="text-[10px] text-gray-500">{s.product_name}</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Warranty: {s.warranty_end_date || 'Active'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-xs">No serial numbers scanned for this order yet.</div>
                    )}
                  </div>
                </div>

                {/* Government Subsidy */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">
                    PM Surya Ghar Subsidy Pipeline
                  </h4>
                  <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-200 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Scheme Status:</span>
                      <span className="font-bold text-teal-900 uppercase">
                        {selectedJob.subsidy?.status || 'NOT TRACKED'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Sanctioned Subsidy:</span>
                      <span className="font-bold text-emerald-700">
                        ₹{(selectedJob.subsidy?.sanctioned_amount ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">DISCOM Application Ref:</span>
                      <span className="font-mono text-gray-800">
                        {selectedJob.subsidy?.application_ref || '—'}
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-800/80 pt-1">
                      Direct Benefit Transfer (DBT) will disburse directly to consumer bank account post DISCOM bi-directional net-meter synchronization.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Admin Action Buttons */}
              <div className="border-t border-gray-200 pt-4 flex flex-wrap justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    navigate(`/web/orders/${selectedJob.order_id}`);
                  }}
                  className="px-3.5 py-1.5 bg-[#6B4B63] hover:bg-[#583D51] text-white rounded font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                  <span>Open Full Sales Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl border border-odoo-border w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="font-bold text-sm text-gray-800">Share Director Dashboard</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Share a secure, read-only dashboard link with external stakeholders, investors or auditors.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 select-all"
              />
              <button
                onClick={copyToClipboard}
                className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-3 py-1.5 rounded text-xs font-semibold"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
