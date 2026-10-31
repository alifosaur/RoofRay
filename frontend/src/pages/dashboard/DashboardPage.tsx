import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, downloadFile } from '../../api/client';
import { useLiveConnection, useLiveRefresh } from '../../live/LiveEvents';
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
  faSyncAlt,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';

const PIE_COLORS = ['#714B67', '#017E84', '#F59E0B', '#EF4444', '#3B82F6', '#10B981'];

type Range = 'today' | 'this_week' | 'this_month' | 'all';
type Granularity = 'day' | 'week' | 'month';

const inr = (n: number | undefined | null) => `₹${Math.round(n ?? 0).toLocaleString('en-IN')}`;

const Kpi: React.FC<{ label: string; value: React.ReactNode; tone?: string; sub?: React.ReactNode }> = ({ label, value, tone = 'text-gray-900', sub }) => (
  <div className="bg-white rounded border border-odoo-border shadow-xs p-3 sm:p-3.5 flex flex-col justify-between">
    <div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block truncate">{label}</span>
      <div className={`text-base sm:text-lg font-bold mt-1 tracking-tight truncate ${tone}`} title={typeof value === 'string' ? value : undefined}>{value}</div>
    </div>
    {sub && <div className="text-[10px] text-gray-400 mt-1 font-medium truncate" title={typeof sub === 'string' ? sub : undefined}>{sub}</div>}
  </div>
);

const STAGE_LABELS: Record<string, string> = {
  new_leads: 'New leads',
  contacted_leads: 'Leads in contact',
  surveys_scheduled: 'Surveys scheduled',
  surveys_awaiting_approval: 'Surveys awaiting approval',
  quotes_open: 'Open quotations',
  orders_awaiting_confirmation: 'Orders awaiting confirmation',
  orders_confirmed: 'Confirmed (to pick)',
  orders_packing: 'Packing',
  orders_packed: 'Packed',
  orders_dispatched: 'Dispatched',
  orders_out_for_delivery: 'Out for delivery',
  orders_delivered: 'Delivered (awaiting install)',
  installs_in_progress: 'Installs in progress',
};

const formatXAxisDate = (val: string) => {
  if (!val) return '';
  if (val.length === 7) {
    const [y, m] = val.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  const parts = val.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return val;
};

const formatYAxisINR = (val: number) => {
  if (!val || val === 0) return '₹0';
  const abs = Math.abs(val);
  if (abs >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val}`;
};

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  const navigate = useNavigate();
  const live = useLiveConnection();

  const [range, setRange] = useState<Range>('this_month');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    Revenue: true,
    Received: true,
    Spent: true,
    Profit: true,
  });

  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const qs = `range=${range}&granularity=${granularity}`;
      const data = shareToken
        ? await api.get<any>(`/reports/shared/${shareToken}?${qs}`)
        : await api.get<any>(`/reports/dashboard?${qs}`);
      setDashboard(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [range, granularity, shareToken]);

  // Live: any hand-off (payment, delivery, job completion, invoice, ticket…) refreshes the numbers
  useLiveRefresh('*', fetchDashboardData);

  const profitJobs: any[] = dashboard?.profit_per_job || [];

  const handleExportExcel = () => {
    downloadFile('/reports/export.xlsx', 'RoofRay_Executive_Report.xlsx').catch((err) =>
      alert(err.message || 'Failed to export report')
    );
  };

  const handleGenerateShareLink = async () => {
    try {
      const res = await api.post<any>('/reports/share-link', { expires_days: 7 });
      setShareableUrl(`${window.location.origin}${res.shareable_url}`);
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

  const series = (dashboard?.profit_series || []).map((p: any) => ({
    name: p.period,
    Revenue: p.revenue,
    Received: p.received,
    Spent: p.spent,
    Profit: p.profit,
  }));

  const stageRows = Object.entries(dashboard?.unfinished_jobs_by_stage || {}).filter(([, v]) => (v as number) > 0);
  const stageBreakdown = stageRows.map(([k, v]) => ({ name: STAGE_LABELS[k] || k, value: v as number }));
  const subsidyRows = Object.entries(dashboard?.subsidy_pipeline || {}).filter(([, v]) => (v as number) > 0);

  const toggle = (opts: string[], value: string, set: (v: any) => void) => (
    <div className="flex items-center bg-gray-100 p-0.5 rounded border border-odoo-border">
      {opts.map((r) => (
        <button
          key={r}
          onClick={() => set(r)}
          className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
            value === r ? 'bg-white text-odoo-primary shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {r.replace('_', ' ')}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-odoo-bg">
      <ControlPanel
        breadcrumbs={[{ label: shareToken ? 'Dashboard (Shared View)' : 'Admin Dashboard' }]}
        actions={
          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-semibold ${live ? 'text-emerald-600' : 'text-gray-400'}`} title="Live updates">
              ● {live ? 'Live' : 'Offline'}
            </span>
            {toggle(['today', 'this_week', 'this_month', 'all'], range, setRange)}
            {toggle(['day', 'week', 'month'], granularity, setGranularity)}
            <button
              onClick={fetchDashboardData}
              className="border border-odoo-border bg-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1"
              title="Refresh"
            >
              <FontAwesomeIcon icon={faSyncAlt} className={loading ? 'animate-spin' : ''} />
            </button>
            {!shareToken && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <FontAwesomeIcon icon={faFileExcel} />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => downloadFile(`/reports/export.pdf?range=${range}`, 'RoofRay_Report.pdf').catch((e) => alert(e.message))}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <FontAwesomeIcon icon={faFilePdf} />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => navigate('/web/users')}
                  className="bg-white border border-odoo-border hover:bg-gray-50 text-gray-800 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span>Add Staff</span>
                </button>
                <button
                  onClick={handleGenerateShareLink}
                  className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <FontAwesomeIcon icon={faShareAlt} />
                  <span>Share</span>
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchDashboardData} className="font-semibold underline">Retry</button>
          </div>
        )}

        {!dashboard && loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded border border-odoo-border animate-pulse" />
            ))}
          </div>
        )}

        {dashboard && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
              <Kpi label="Revenue (sales)" value={inr(dashboard.total_revenue)} tone="text-odoo-primary" />
              <Kpi label="Money received" value={inr(dashboard.money_received)} tone="text-emerald-700" />
              <Kpi
                label="Money spent"
                value={inr(dashboard.money_spent)}
                tone="text-rose-700"
                sub={`Stock ${inr(dashboard.spend_breakdown?.stock_purchases)} · Pay ${inr(dashboard.spend_breakdown?.technician_pay)} · Other ${inr(dashboard.spend_breakdown?.other_costs)}`}
              />
              <Kpi label="Pending payments" value={inr(dashboard.pending_payments)} tone="text-amber-600" sub="All open orders" />
              <Kpi label="Net profit (jobs)" value={inr(dashboard.net_profit)} tone="text-teal-800" sub={`Margin ${dashboard.profit_margin_percent ?? 0}%`} />
              <Kpi
                label="Technician payouts"
                value={inr(dashboard.technician_payouts?.unpaid)}
                sub={`unpaid · paid ${inr(dashboard.technician_payouts?.paid_in_period)}`}
              />
              <Kpi label="Open tickets" value={dashboard.open_tickets_count ?? 0} tone="text-rose-600" />
              <Kpi
                label="Low stock SKUs"
                value={
                  <span className="flex items-center gap-1.5">
                    {dashboard.low_stock_products_count ?? 0}
                    {(dashboard.low_stock_products_count ?? 0) > 0 && <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs text-amber-500" />}
                  </span>
                }
                tone="text-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded border border-odoo-border shadow-xs p-5 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faChartLine} className="text-[#6B4B63]" />
                    <span>Revenue, cash and profit per {granularity}</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: 'Revenue', label: 'Revenue', color: '#714B67' },
                      { key: 'Received', label: 'Received', color: '#017E84' },
                      { key: 'Spent', label: 'Spent', color: '#D97706' },
                      { key: 'Profit', label: 'Profit', color: '#10B981' },
                    ].map(({ key, label, color }) => {
                      const active = visibleLines[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleLine(key)}
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            active
                              ? 'bg-white shadow-xs'
                              : 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60'
                          }`}
                          style={{
                            borderColor: active ? color : undefined,
                            color: active ? color : undefined,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: active ? color : '#9CA3AF' }}
                          />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-72">
                  {series.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400 border border-dashed rounded">
                      No financial activity in this period yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#6C757D' }}
                          tickFormatter={formatXAxisDate}
                          minTickGap={20}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#6C757D' }}
                          tickFormatter={formatYAxisINR}
                          width={60}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [inr(Number(value)), name]}
                          labelFormatter={(label: any) => {
                            if (!label) return '';
                            const parts = String(label).split('-');
                            if (parts.length === 3) {
                              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                              return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                            }
                            return label;
                          }}
                          contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        {visibleLines.Revenue && (
                          <Line
                            type="monotone"
                            dataKey="Revenue"
                            stroke="#714B67"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#714B67' }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                        {visibleLines.Received && (
                          <Line
                            type="monotone"
                            dataKey="Received"
                            stroke="#017E84"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#017E84' }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                        {visibleLines.Spent && (
                          <Line
                            type="monotone"
                            dataKey="Spent"
                            stroke="#D97706"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 3, fill: '#D97706' }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {visibleLines.Profit && (
                          <Line
                            type="monotone"
                            dataKey="Profit"
                            stroke="#10B981"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#10B981' }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faTools} className="text-teal-600" />
                  <span>Unfinished work by stage</span>
                </h3>
                {stageBreakdown.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-gray-400">Nothing in progress.</div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stageBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                            {stageBreakdown.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs">
                      {stageBreakdown.map((s) => (
                        <li key={s.name} className="flex justify-between"><span className="text-gray-600">{s.name}</span><strong>{s.value}</strong></li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">Subsidy status</h3>
                {subsidyRows.length === 0 ? (
                  <div className="text-xs text-gray-400">No subsidy applications yet.</div>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {subsidyRows.map(([k, v]) => (
                      <li key={k} className="flex justify-between"><span className="text-gray-600">{k.replace(/_/g, ' ').toLowerCase()}</span><strong>{v as number}</strong></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">Low stock</h3>
                {(dashboard.low_stock_items || []).length === 0 ? (
                  <div className="text-xs text-gray-400">All stock above minimum levels.</div>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {dashboard.low_stock_items.map((p: any) => (
                      <li key={p.sku} className="flex justify-between">
                        <span className="text-gray-600">{p.name}</span>
                        <strong className="text-amber-700">{p.stock} / min {p.min}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* Detailed Profit Per Job Table matching Screenshot */}
        {!shareToken && dashboard && (
          <div className="bg-white rounded border border-odoo-border shadow-xs p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faChartPie} className="text-odoo-primary" />
                <span>Profit per job (revenue − stock cost − technician pay − other costs)</span>
              </h3>
              <span className="text-[11px] text-gray-500">
                Click any row or tap <strong>Details</strong> to view complete order breakdown
              </span>
            </div>

            {profitJobs.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                No confirmed orders in this period yet.
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
