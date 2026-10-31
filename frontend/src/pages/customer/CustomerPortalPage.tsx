import React, { useState, useEffect } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, downloadFile } from '../../api/client';
import { SUBSIDY_STEPS, subsidyStepIndex } from '../../constants/subsidy';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { SquiggleLink } from '../../components/common/SquiggleLink';

interface TrackerStage {
  key: string;
  title: string;
  status: 'COMPLETED' | 'CURRENT' | 'PENDING';
  date?: string | null;
  description?: string | null;
}

interface TrackerData {
  lead_id?: number | null;
  order_id?: number | null;
  system_size_kw?: number | null;
  system_type?: string | null;
  current_stage_key: string;
  current_stage_name: string;
  stages: TrackerStage[];
}

interface EquipmentItem {
  id: number;
  serial_number: string;
  product_name: string;
  product_category: string;
  warranty_years: number;
  delivered_on?: string | null;
  warranty_end?: string | null;
  days_remaining?: number | null;
  is_in_warranty: boolean;
}

interface QuoteLine {
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface QuoteData {
  id: number;
  quote_number: string;
  bom_name: string;
  capacity_kw: number;
  system_type: string;
  status: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  created_at: string;
  valid_until?: string | null;
  has_pdf: boolean;
  lines: QuoteLine[];
}

interface OrderData {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  created_at: string;
  delivery_date?: string | null;
  payments: Array<{
    id: number;
    amount: number;
    payment_method: string;
    reference?: string;
    date: string;
  }>;
  invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
    status: string;
  } | null;
}

interface SubsidyRecord {
  id?: number;
  application_no?: string | null;
  portal_name: string;
  status: string;
  eligible_amount: number;
  sanctioned_amount: number;
  disbursed_amount: number;
  applied_date?: string | null;
  approved_date?: string | null;
  disbursed_date?: string | null;
  rejection_notes?: string | null;
  remarks?: string | null;
  events?: { status: string; event_date: string; reference_no?: string | null; document_url?: string | null; notes?: string | null }[];
}

interface SchemeData {
  id: number;
  name: string;
  description: string;
  eligibility: string;
  benefit_amounts: string;
  how_to_apply: string;
  official_link: string;
  state: string;
  is_active: boolean;
  is_announcement: boolean;
  announcement_text?: string | null;
  cfa_per_kw_first_2kw: number;
  cfa_per_kw_3rd_kw: number;
  cfa_max: number;
  state_topup_per_kw: number;
  grid_connected_only: boolean;
}

export const CustomerPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'catalogue' | 'enquiry' | 'tracker' | 'quotes' | 'equipment' | 'schemes'>('catalogue');
  
  // Data states
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [schemes, setSchemes] = useState<SchemeData[]>([]);
  const nationalScheme = schemes.find((sc) => sc.state.toLowerCase().includes('national'));
  const [subsidy, setSubsidy] = useState<SubsidyRecord | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [myEnquiry, setMyEnquiry] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Enquiry form state
  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    property_type: '',
    roof_type: '',
    roof_length_ft: 0,
    roof_width_ft: 0,
    shadow_free_area_sqft: 0,
    floor_number: 1,
    roof_direction: '',
    monthly_bill_amount: 0,
    preferred_system_type: 'On-Grid',
    preferred_capacity_kw: 3.0,
    notes: '',
  });

  // Ticket modal state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  // Subsidy calculator state
  const [calcCapacity, setCalcCapacity] = useState<number>(3.0);
  const [calcSystemType, setCalcSystemType] = useState<string>('On-Grid');
  const [calcState, setCalcState] = useState<string>('National');
  const [calcResult, setCalcResult] = useState<any>(null);

  // Load customer data
  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, qData, oData, eqData, sData, subData] = await Promise.allSettled([
        api.get<TrackerData>('/customer/tracker'),
        api.get<QuoteData[]>('/customer/quotes'),
        api.get<OrderData[]>('/customer/orders'),
        api.get<EquipmentItem[]>('/customer/equipment'),
        api.get<SchemeData[]>('/customer/schemes'),
        api.get<SubsidyRecord>('/customer/subsidy'),
      ]);
      api.get<any[]>('/finance/invoices').then(setInvoices).catch(() => setInvoices([]));
      api.get<any>('/customer/enquiry').then(setMyEnquiry).catch(() => setMyEnquiry(null));

      if (tData.status === 'fulfilled') setTracker(tData.value);
      if (qData.status === 'fulfilled') setQuotes(qData.value);
      if (oData.status === 'fulfilled') setOrders(oData.value);
      if (eqData.status === 'fulfilled') setEquipment(eqData.value);
      if (sData.status === 'fulfilled') setSchemes(sData.value);
      if (subData.status === 'fulfilled') setSubsidy(subData.value);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh('*', loadData);

  useEffect(() => {
    loadData();
    runSubsidyEstimate(3.0, 'On-Grid', 'National');
  }, []);

  const runSubsidyEstimate = async (kw: number, sysType: string, st: string) => {
    try {
      const res = await api.post('/customer/schemes/estimate', {
        capacity_kw: kw,
        system_type: sysType,
        state: st,
      });
      setCalcResult(res);
    } catch (err) {
      console.error('Failed to calculate subsidy:', err);
    }
  };

  // Handle "I'm Interested" from product catalogue
  const handleSelectPackage = (capacity: number, sysType: string) => {
    setEnquiryForm(prev => ({
      ...prev,
      preferred_capacity_kw: capacity,
      preferred_system_type: sysType,
      notes: `Interested in ${capacity} kW ${sysType} package`,
    }));
    setActiveTab('enquiry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Live solar kW helper from roof dimensions
  const computedRoofArea = (enquiryForm.roof_length_ft || 0) * (enquiryForm.roof_width_ft || 0);
  const estimatedKwFromArea = Math.max(1, Math.min(10, Math.floor(computedRoofArea / 100)));
  const estimatedMonthlyUnits = Math.round(enquiryForm.preferred_capacity_kw * 115);
  const estimatedMonthlySavings = Math.round(estimatedMonthlyUnits * 7.5);

  // Handle Enquiry submission
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Blank / zero measurements mean "not known" and are sent as missing, never as values
      const body = Object.fromEntries(
        Object.entries({ ...enquiryForm, roof_area_sqft: computedRoofArea }).map(([k, v]) => [k, v === '' || v === 0 ? undefined : v])
      );
      const res = await api.post<any>('/customer/enquiry', body);
      setNoticeMessage(res.message || 'Thank you! Our sales representative will contact you soon.');
      await loadData();
      setActiveTab('tracker');
    } catch (err: any) {
      alert(err.message || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quote Acceptance
  const handleAcceptQuote = async (quoteId: number) => {
    if (!window.confirm('Accept this quotation? This will confirm your solar order and initiate warehouse dispatch.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<any>(`/customer/quotes/${quoteId}/accept`);
      setNoticeMessage(res.message || 'Quote accepted successfully!');
      await loadData();
      setActiveTab('tracker');
    } catch (err: any) {
      alert(err.message || 'Failed to accept quote');
    } finally {
      setLoading(false);
    }
  };

  // Handle Raising Ticket
  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;
    setTicketSubmitting(true);
    try {
      const res = await api.post<any>('/customer/tickets', {
        serial_item_id: selectedEquipment?.id || null,
        subject: ticketSubject,
        description: ticketDescription,
        priority: 'NORMAL',
      });
      alert(res.message || 'Ticket raised successfully!');
      setShowTicketModal(false);
      setTicketSubject('');
      setTicketDescription('');
      setSelectedEquipment(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to raise service ticket');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Catalogue product definitions
  const [packages, setPackages] = useState<any[] | null>(null);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const loadPackages = () => {
    setPackagesError(null);
    api
      .get<any[]>('/customer/packages')
      .then((data) =>
        setPackages(
          data.map((p) => {
            const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
            const warranties = Array.from(
              new Set(p.components.filter((c: any) => c.warranty_years > 1).map((c: any) => `${c.warranty_years} yrs ${c.category}`))
            );
            return {
              id: p.id,
              title: p.name,
              badge: p.subsidy_eligible ? 'Subsidy eligible' : 'Not subsidy eligible',
              badgeColor: p.subsidy_eligible
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-gray-100 text-gray-700 border-gray-200',
              systemType: p.system_type,
              capacityKw: p.capacity_kw,
              generation: `~${(p.monthly_generation_units * 12).toLocaleString('en-IN')} units / yr`,
              grossPrice: inr(p.gross_price),
              subsidy: p.subsidy_eligible ? inr(p.subsidy_amount) : 'Not eligible (Off-Grid)',
              netPrice: inr(p.net_price),
              warranty: warranties.join(', ') || '—',
              components: p.components.map((c: any) => `${c.name} × ${c.quantity}`),
            };
          })
        )
      )
      .catch((err) => setPackagesError(err.message || 'Could not load packages'));
  };
  useEffect(loadPackages, []);

  return (
    <div className="min-h-screen bg-[#FDFCFD] flex flex-col font-sans select-text">
      {/* 1. Global Site Navbar */}
      <SiteNavbar />

      {/* 2. Customer Portal Header Banner */}
      <section className="bg-slate-50/80 py-8 sm:py-10 border-b border-gray-200">
        <div className="max-w-[1320px] mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              RoofRay Customer Portal
            </span>
            <div className="mt-1">
              <ScriptHeading as="h1" className="text-3xl sm:text-4xl md:text-5xl">
                My Rooftop Solar Project
              </ScriptHeading>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-[#6C757D]">
              Welcome back, <strong>{user?.full_name || 'Customer'}</strong>. Track your installation stages, view quotations, and inspect warranties.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              {tracker?.current_stage_name || 'Active Account'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-[1320px] mx-auto px-6 mt-6">
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'catalogue', label: 'Solar Packages', icon: 'fa-cubes-stacked' },
              { id: 'enquiry', label: 'Enquiry & Sizing', icon: 'fa-ruler-combined' },
              { id: 'tracker', label: 'Project Tracker', icon: 'fa-route', badge: tracker?.current_stage_name },
              { id: 'quotes', label: 'Quotations & Orders', icon: 'fa-file-invoice-dollar', count: quotes.length },
              { id: 'equipment', label: 'Equipment & Warranty', icon: 'fa-shield-halved', count: equipment.length },
              { id: 'schemes', label: 'PM Surya Ghar & Subsidy', icon: 'fa-hand-holding-dollar' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#6B4B63] text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-[#495057] hover:text-[#6B4B63] hover:border-[#6B4B63]/40'
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-xs`}></i>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && activeTab !== tab.id && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Notice alert if active */}
        {noticeMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
              <span className="font-medium">{noticeMessage}</span>
            </div>
            <button
              onClick={() => setNoticeMessage(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: PRODUCT CATALOGUE */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'catalogue' && (
          <div>
            <div className="bg-gradient-to-r from-odoo-purple to-[#8a5d7e] rounded-xl text-white p-6 sm:p-8 shadow-sm mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    RoofRay Premium Solar Catalog
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold mt-1 mb-2">
                    Turnkey Rooftop Solar Systems (1 - 5 kW)
                  </h1>
                  <p className="text-xs text-purple-100 max-w-2xl leading-relaxed">
                    Designed for residential rooftops with Tier-1 Mono-PERC panels, smart inverters, full BOM electrical kits, and support with PM Surya Ghar subsidy applications.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('enquiry')}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-2"
                >
                  <i className="fa-solid fa-calculator"></i>
                  <span>Custom Roof Sizing Helper</span>
                </button>
              </div>
            </div>

            {packagesError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex justify-between">
                <span>{packagesError}</span>
                <button onClick={loadPackages} className="font-semibold underline">Retry</button>
              </div>
            )}
            {!packages && !packagesError && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            )}
            {packages && packages.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm border border-dashed rounded-xl">No packages published yet.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(packages || []).map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${pkg.badgeColor}`}>
                        {pkg.badge}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        {pkg.systemType}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-1">{pkg.title}</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-xl font-bold text-odoo-purple">{pkg.netPrice}</span>
                      <span className="text-xs text-gray-400 line-through">{pkg.grossPrice}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Subsidy included
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mb-4 bg-gray-50 p-2 rounded border border-gray-100">
                      <i className="fa-solid fa-gift text-purple-600 mr-1.5"></i>
                      <strong>Subsidy:</strong> {pkg.subsidy}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 mb-4 py-2 border-y border-gray-100">
                      <div>
                        <span className="text-gray-400 block">Est. Generation:</span>
                        <strong className="text-gray-800">{pkg.generation}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Capacity:</span>
                        <strong className="text-gray-800">{pkg.capacityKw} kW</strong>
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-2">
                        BOM Hardware Included:
                      </span>
                      <ul className="space-y-1 text-xs text-gray-600">
                        {pkg.components.map((comp: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <i className="fa-solid fa-check text-emerald-500 text-[10px] mt-0.5"></i>
                            <span className="text-[11px]">{comp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">
                      <i className="fa-solid fa-shield-halved text-emerald-600 mr-1"></i>
                      {pkg.warranty}
                    </span>
                    <button
                      onClick={() => handleSelectPackage(pkg.capacityKw, pkg.systemType)}
                      className="px-3.5 py-1.5 bg-odoo-purple hover:bg-odoo-purple/90 text-white font-bold text-xs rounded transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>I'm Interested</span>
                      <i className="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: ENQUIRY & MEASUREMENTS FORM */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'enquiry' && myEnquiry && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="border-b border-gray-200 pb-4 mb-5 flex flex-wrap justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-odoo-purple">Enquiry submitted</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Your rooftop details</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Locked after consultation. To change anything, contact your sales advisor
                    {myEnquiry.sales_contact ? ` (${myEnquiry.sales_contact})` : ''}.
                  </p>
                </div>
                <span className="self-start text-[11px] font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">
                  <i className="fa-solid fa-lock mr-1"></i>
                  {String(myEnquiry.status).replace(/_/g, ' ')}
                </span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                {[
                  ['Full name', myEnquiry.name],
                  ['Phone', myEnquiry.phone],
                  ['Email', myEnquiry.email],
                  ['Installation address', myEnquiry.address],
                  ['City', myEnquiry.city],
                  ['State', myEnquiry.state],
                  ['PIN code', myEnquiry.pincode],
                  ['Property type', myEnquiry.property_type],
                  ['Roof type', myEnquiry.roof_type],
                  ['Roof area', myEnquiry.roof_area_sqft ? `${myEnquiry.roof_area_sqft} sq.ft` : null],
                  ['Shadow-free area', myEnquiry.shadow_free_area_sqft ? `${myEnquiry.shadow_free_area_sqft} sq.ft` : null],
                  ['Floor', myEnquiry.floor_number],
                  ['Roof direction', myEnquiry.roof_direction],
                  ['Monthly bill', myEnquiry.monthly_bill_amount ? `₹${Math.round(myEnquiry.monthly_bill_amount).toLocaleString('en-IN')}` : null],
                  ['System', `${myEnquiry.required_capacity} kW ${myEnquiry.system_type}`],
                  ['Submitted', new Date(myEnquiry.created_at + 'Z').toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-gray-400">{label}</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
              {myEnquiry.notes && <p className="mt-4 text-xs text-gray-600"><span className="text-gray-400">Notes: </span>{myEnquiry.notes}</p>}
            </div>
          </div>
        )}

        {activeTab === 'enquiry' && !myEnquiry && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm mb-6">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <span className="text-xs font-bold text-odoo-purple uppercase tracking-wider">
                  Customer Rooftop Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  Book a Call & Rooftop Feasibility Form
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your address and roof dimensions. Our live helper will estimate your ideal capacity (kW) and monthly bill savings.
                </p>
              </div>

              <form onSubmit={handleSubmitEnquiry} className="space-y-6">
                {/* 1. Contact & Property Details */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-odoo-purple flex items-center justify-center text-[11px]">1</span>
                    Contact & Property Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={enquiryForm.name}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={enquiryForm.phone}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={enquiryForm.email}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Installation Address *</label>
                      <input
                        type="text"
                        required
                        value={enquiryForm.address}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, address: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple focus:border-odoo-purple"
                        placeholder="House / Plot / Building Name & Street"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={enquiryForm.city}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, city: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={enquiryForm.state}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, state: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Postal PIN Code</label>
                      <input
                        type="text"
                        value={enquiryForm.pincode}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, pincode: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Property Type</label>
                      <select
                        value={enquiryForm.property_type}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, property_type: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple"
                      >
                        <option value="">Select property type</option>
                        <option value="Residential">Residential Individual House / Villa</option>
                        <option value="Housing Society">Housing Society / Apartment Complex</option>
                        <option value="Commercial">Commercial / Industrial Building</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Roof Measurements & Technical Parameters */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-odoo-purple flex items-center justify-center text-[11px]">2</span>
                    Roof Measurements & Electricity Bill
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Roof Length (ft)</label>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={enquiryForm.roof_length_ft}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, roof_length_ft: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Roof Width (ft)</label>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={enquiryForm.roof_width_ft}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, roof_width_ft: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Roof Area</label>
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded font-bold text-gray-700">
                        {computedRoofArea} sq.ft
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Shadow-Free Area (sq.ft)</label>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        value={enquiryForm.shadow_free_area_sqft}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, shadow_free_area_sqft: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Roof Type</label>
                      <select
                        value={enquiryForm.roof_type}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, roof_type: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      >
                        <option value="">Select roof type</option>
                        <option value="Concrete / Flat">Concrete / Flat Terrace</option>
                        <option value="Tiled / Slanted">Slanted Clay Tiled Roof</option>
                        <option value="Tin / Metal Sheet">Tin / Metal Industrial Sheet</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Floor / Storey</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={enquiryForm.floor_number}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, floor_number: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Roof Facing Direction</label>
                      <select
                        value={enquiryForm.roof_direction}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, roof_direction: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      >
                        <option value="">Don't know</option>
                        <option value="South">South (Optimal 100% Generation)</option>
                        <option value="South-West">South-West</option>
                        <option value="South-East">South-East</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="North">North (Low Solar Yield)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Power Bill (₹)</label>
                      <input
                        type="number"
                        min="500"
                        max="200000"
                        value={enquiryForm.monthly_bill_amount}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, monthly_bill_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded font-semibold text-gray-800"
                      />
                    </div>
                  </div>

                  {/* LIVE SOLAR SIZING HELPER WIDGET */}
                  <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fa-solid fa-wand-magic-sparkles text-odoo-purple text-sm"></i>
                      <span className="text-xs font-bold text-odoo-purple uppercase tracking-wider">
                        Live Solar Sizing & Savings Calculator
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white/80 p-2.5 rounded border border-purple-100">
                        <span className="text-gray-500 block text-[11px]">Recommended Size:</span>
                        <strong className="text-base text-odoo-purple">{estimatedKwFromArea} kW</strong>
                        <span className="text-[10px] text-gray-400 block">(~100 sq.ft per kW)</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded border border-purple-100">
                        <span className="text-gray-500 block text-[11px]">Est. Generation:</span>
                        <strong className="text-base text-gray-800">{estimatedMonthlyUnits} units / mo</strong>
                        <span className="text-[10px] text-emerald-600 block font-semibold">Clean Solar Power</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded border border-purple-100">
                        <span className="text-gray-500 block text-[11px]">Est. Monthly Savings:</span>
                        <strong className="text-base text-emerald-700">₹{estimatedMonthlySavings} / mo</strong>
                        <span className="text-[10px] text-gray-400 block">Based on ₹7.50/unit</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. System Preferences */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">System Type Preference</label>
                      <div className="flex gap-2">
                        <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-xs flex items-center gap-2 ${
                          enquiryForm.preferred_system_type === 'On-Grid'
                            ? 'border-odoo-purple bg-purple-50/50 font-bold text-odoo-purple'
                            : 'border-gray-200'
                        }`}>
                          <input
                            type="radio"
                            name="systemType"
                            checked={enquiryForm.preferred_system_type === 'On-Grid'}
                            onChange={() => setEnquiryForm({ ...enquiryForm, preferred_system_type: 'On-Grid' })}
                          />
                          <div>
                            <div>On-Grid (Grid-Tied)</div>
                            <span className="text-[10px] text-emerald-600 font-normal">PM Surya Ghar Subsidy Eligible</span>
                          </div>
                        </label>
                        <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-xs flex items-center gap-2 ${
                          enquiryForm.preferred_system_type === 'Off-Grid'
                            ? 'border-odoo-purple bg-purple-50/50 font-bold text-odoo-purple'
                            : 'border-gray-200'
                        }`}>
                          <input
                            type="radio"
                            name="systemType"
                            checked={enquiryForm.preferred_system_type === 'Off-Grid'}
                            onChange={() => setEnquiryForm({ ...enquiryForm, preferred_system_type: 'Off-Grid' })}
                          />
                          <div>
                            <div>Off-Grid (Battery Bank)</div>
                            <span className="text-[10px] text-gray-500 font-normal">Independent 24x7 Power</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred Capacity (kW)</label>
                      <select
                        value={enquiryForm.preferred_capacity_kw}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, preferred_capacity_kw: parseFloat(e.target.value) || 3.0 })}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded font-bold text-gray-800"
                      >
                        <option value={1.0}>1 kW Rooftop System</option>
                        <option value={2.0}>2 kW Rooftop System</option>
                        <option value={3.0}>3 kW Rooftop System (Optimal for most homes)</option>
                        <option value={4.0}>4 kW Rooftop System</option>
                        <option value={5.0}>5 kW Rooftop System</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Notes / Special Instructions</label>
                    <textarea
                      rows={2}
                      value={enquiryForm.notes}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, notes: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      placeholder="Any shading from nearby water tanks, trees, or special cable routing requests..."
                    ></textarea>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalogue')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-odoo-purple hover:bg-odoo-purple/90 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-2"
                  >
                    <i className="fa-solid fa-phone"></i>
                    <span>Book Consultation Call & Submit Details</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: 13-STAGE PROJECT TRACKER */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'tracker' && (
          <div className="max-w-4xl mx-auto">
            {/* Top Project Summary Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Project Stage</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-odoo-purple border border-purple-200">
                      {tracker?.current_stage_name || 'Enquiry Received'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">
                    {tracker?.system_size_kw || 3.0} kW {tracker?.system_type || 'On-Grid'} Rooftop Solar Project
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Order Ref: <span className="font-mono font-semibold text-gray-700">SO-2026-{tracker?.order_id ? `${tracker.order_id}`.padStart(4, '0') : '0001'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('quotes')}
                    className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 rounded flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-file-invoice text-odoo-purple"></i>
                    <span>View Quotations</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('schemes')}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-odoo-purple rounded border border-purple-200 flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-hand-holding-dollar"></i>
                    <span>Subsidy Status</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stepper Timeline (13 Stages) */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 pb-2 border-b border-gray-100 flex items-center justify-between">
                <span>13-Stage Project Lifecycle Stepper</span>
                <span className="text-[11px] font-normal text-gray-400">Live Real-Time Sync</span>
              </h3>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {tracker?.stages.map((stage, idx) => {
                  const isCompleted = stage.status === 'COMPLETED';
                  const isCurrent = stage.status === 'CURRENT';

                  return (
                    <div key={stage.key} className="relative flex items-start gap-4">
                      {/* Step Indicator Dot */}
                      <div
                        className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : isCurrent
                            ? 'bg-odoo-purple text-white ring-4 ring-purple-100 shadow'
                            : 'bg-white border-2 border-gray-300 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <i className="fa-solid fa-check text-[10px]"></i>
                        ) : (
                          <span className="text-[10px]">{idx + 1}</span>
                        )}
                      </div>

                      {/* Stage Content */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className={`text-sm font-bold ${
                            isCompleted ? 'text-gray-900' : isCurrent ? 'text-odoo-purple' : 'text-gray-400'
                          }`}>
                            {stage.title}
                          </h4>
                          {stage.date && (
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              <i className="fa-regular fa-calendar mr-1 text-gray-400"></i>
                              {stage.date}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${
                          isCurrent ? 'text-gray-700 font-medium' : 'text-gray-500'
                        }`}>
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: QUOTATIONS & ORDERS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quotations & Accepted Orders</h2>
                <p className="text-xs text-gray-500">Review bill of materials (BOM), prices, PDF copies and accept quotes.</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Invoices</h3>
              {invoices.length === 0 ? (
                <p className="text-xs text-gray-500">No invoices yet. An invoice is issued when your order is confirmed.</p>
              ) : (
                <ul className="divide-y divide-gray-100 text-xs">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="py-2 flex items-center justify-between">
                      <span className="font-mono font-semibold">{inv.invoice_number}</span>
                      <span>₹{Math.round(inv.total_amount).toLocaleString('en-IN')}</span>
                      <span className={inv.status === 'PAID' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>{inv.status}</span>
                      <button
                        onClick={() => downloadFile(`/finance/invoices/${inv.id}/pdf`, `${inv.invoice_number}.pdf`).catch((err) => alert(err.message))}
                        className="underline text-odoo-purple"
                      >
                        PDF
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quotations List */}
            {quotes.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                <i className="fa-solid fa-file-invoice text-3xl text-gray-300 mb-2"></i>
                <p className="text-sm font-semibold">No quotations generated yet</p>
                <p className="text-xs text-gray-400 mt-1">Submit your roof details to receive an engineering BOM quotation.</p>
              </div>
            ) : (
              quotes.map((q) => (
                <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900">{q.quote_number}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          q.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Template: <span className="font-semibold text-gray-700">{q.bom_name}</span> ({q.capacity_kw} kW {q.system_type})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          downloadFile(`/quotes/${q.id}/pdf`, `Quote_${q.quote_number}.pdf`).catch((err) =>
                            alert(err.message || 'Quotation PDF not available')
                          )
                        }
                        className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 rounded flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-file-pdf text-red-500"></i>
                        <span>Download PDF</span>
                      </button>
                      {q.status === 'SENT' && (
                        <button
                          onClick={() => handleAcceptQuote(q.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-sm"
                        >
                          <i className="fa-solid fa-check"></i>
                          <span>Accept & Confirm Order</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BOM Lines Table */}
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 border-y border-gray-200">
                        <tr>
                          <th className="py-2 px-3">BOM Item / Product</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {q.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-medium text-gray-900">{line.product_name}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-500">{line.sku}</td>
                            <td className="py-2 px-3 text-center font-bold">{line.quantity}</td>
                            <td className="py-2 px-3 text-right">₹{line.unit_price.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-semibold">₹{line.subtotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quote Totals */}
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span className="text-xs text-gray-500">
                      * Includes turnkey on-site mounting, wiring, DISCOM net-meter liaison, and 20-year warranty.
                    </span>
                    <div className="text-right text-xs space-y-1">
                      <div className="text-gray-500">Subtotal: <span className="font-semibold text-gray-800">₹{q.subtotal.toLocaleString()}</span></div>
                      <div className="text-gray-500">GST (13.8% blended): <span className="font-semibold text-gray-800">₹{q.tax_amount.toLocaleString()}</span></div>
                      <div className="text-base font-bold text-odoo-purple pt-1 border-t border-gray-200">
                        Total Amount: ₹{q.total_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Confirmed Orders Card */}
            {orders.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Confirmed Sales Orders</h3>
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{o.order_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            {o.status}
                          </span>
                        </div>
                        <p className="text-gray-500 mt-0.5">Created: {o.created_at}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Total Amount:</span>
                          <strong className="text-gray-800">₹{o.total_amount.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Paid:</span>
                          <strong className="text-emerald-700">₹{o.paid_amount.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Balance:</span>
                          <strong className="text-gray-800">₹{o.balance_amount.toLocaleString()}</strong>
                        </div>
                        {o.invoice && (
                          <span className="px-2.5 py-1 bg-white border border-gray-200 rounded font-semibold text-gray-700">
                            Inv: {o.invoice.invoice_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: EQUIPMENT & WARRANTY */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'equipment' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Installed Solar Hardware & Warranties</h2>
                <p className="text-xs text-gray-500">Every serialised unit scanned by warehouse and installed on your rooftop.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedEquipment(null);
                  setShowTicketModal(true);
                }}
                className="px-3.5 py-2 bg-odoo-purple hover:bg-odoo-purple/90 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <i className="fa-solid fa-headset"></i>
                <span>Raise Service Request</span>
              </button>
            </div>

            {equipment.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                <i className="fa-solid fa-barcode text-3xl text-gray-300 mb-2"></i>
                <p className="text-sm font-semibold">No equipment delivered yet</p>
                <p className="text-xs text-gray-400 mt-1">Serialized units will appear here upon warehouse dispatch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipment.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {item.product_category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.is_in_warranty
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.is_in_warranty ? 'In Warranty' : 'Expired'}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm mb-1">{item.product_name}</h4>
                      <p className="font-mono text-xs text-odoo-purple font-semibold mb-3 flex items-center gap-1.5">
                        <i className="fa-solid fa-barcode text-gray-400"></i>
                        <span>{item.serial_number}</span>
                      </p>

                      <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Delivered On:</span>
                          <span className="font-medium text-gray-800">{item.delivered_on || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Warranty Expiration:</span>
                          <span className="font-medium text-gray-800">{item.warranty_end || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Days Remaining:</span>
                          <span className={`font-bold ${item.is_in_warranty ? 'text-emerald-700' : 'text-red-600'}`}>
                            {item.days_remaining !== null && item.days_remaining !== undefined
                              ? `${item.days_remaining} days`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEquipment(item);
                        setTicketSubject(`Service Request for ${item.product_name} (${item.serial_number})`);
                        setShowTicketModal(true);
                      }}
                      className="w-full py-2 border border-odoo-purple text-odoo-purple hover:bg-purple-50 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-wrench"></i>
                      <span>Raise Maintenance Ticket</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: GOVERNMENT SCHEMES & SUBSIDY TRACKER */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'schemes' && (
          <div className="space-y-8">
            {/* PM Surya Ghar Hero Banner */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-500 rounded-xl text-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-yellow-200">
                    Government of India Initiative (MNRE)
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold mt-1 mb-2">
                    PM Surya Ghar: Muft Bijli Yojana
                  </h1>
                  <p className="text-xs text-orange-100 max-w-2xl leading-relaxed">
                    {nationalScheme
                      ? `Central subsidy of up to ₹${nationalScheme.cfa_max.toLocaleString('en-IN')} for grid-connected residential rooftop solar. Confirm current amounts on the official portal.`
                      : 'Scheme details are not published yet.'}
                  </p>
                </div>
                <a
                  href="https://pmsuryaghar.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>National Portal (pmsuryaghar.gov.in)</span>
                </a>
              </div>
            </div>

            {/* Subsidy Slab Rules (from the admin-managed schemes table) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {nationalScheme ? (
                [1, 2, 3].map((kw) => {
                  const amt = Math.min(
                    Math.min(kw, 2) * nationalScheme.cfa_per_kw_first_2kw +
                      Math.max(0, Math.min(kw, 3) - 2) * nationalScheme.cfa_per_kw_3rd_kw,
                    nationalScheme.cfa_max || Infinity
                  );
                  return (
                    <div key={kw} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <span className="text-xs font-bold text-gray-400 block mb-1">{kw === 3 ? '3 kW & Above (Max)' : `${kw} kW System`}</span>
                      <div className="text-2xl font-bold text-orange-600 mb-1">₹{amt.toLocaleString('en-IN')}</div>
                      <p className="text-xs text-gray-500">Central financial assistance for grid-connected systems.</p>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-3 p-5 text-xs text-gray-500 border border-dashed rounded-xl">No subsidy scheme published yet.</div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <span className="text-xs font-bold text-gray-400 block mb-1">Off-Grid Systems</span>
                <div className="text-2xl font-bold text-gray-400 mb-1">₹0</div>
                <p className="text-xs text-gray-500">Off-Grid systems with battery banks are NOT eligible for central subsidies.</p>
              </div>
            </div>

            {/* Interactive Calculator Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-calculator text-odoo-purple"></i>
                <span>Interactive PM Surya Ghar Subsidy Calculator</span>
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Adjust capacity and system type to see instant gross price, subsidy credit, and net investment.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                      <span>Rooftop Solar Capacity:</span>
                      <span className="text-odoo-purple font-bold text-sm">{calcCapacity} kW</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="10.0"
                      step="0.5"
                      value={calcCapacity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCalcCapacity(val);
                        runSubsidyEstimate(val, calcSystemType, calcState);
                      }}
                      className="w-full accent-odoo-purple cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>1 kW</span>
                      <span>3 kW (Popular)</span>
                      <span>5 kW</span>
                      <span>10 kW</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">System Type</label>
                      <select
                        value={calcSystemType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCalcSystemType(val);
                          runSubsidyEstimate(calcCapacity, val, calcState);
                        }}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded font-bold"
                      >
                        <option value="On-Grid">On-Grid (Subsidy Eligible)</option>
                        <option value="Off-Grid">Off-Grid (No Subsidy)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">State Incentive</label>
                      <select
                        value={calcState}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCalcState(val);
                          runSubsidyEstimate(calcCapacity, calcSystemType, val);
                        }}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded"
                      >
                        <option value="National">National / General State</option>
                        {schemes
                          .filter((sc) => !sc.state.toLowerCase().includes('national'))
                          .map((sc) => (
                            <option key={sc.id} value={sc.state}>{sc.state}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {calcResult && !calcResult.is_eligible && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <i className="fa-solid fa-triangle-exclamation mr-1.5 text-amber-600"></i>
                      {calcResult.subsidy_breakdown}
                    </div>
                  )}
                </div>

                {/* Calculator Result Card */}
                <div className="lg:col-span-6 bg-[#FAF8F9] border border-purple-200 rounded-xl p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-odoo-purple mb-4">
                    Subsidy & Cost Breakdown ({calcCapacity} kW {calcSystemType})
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Estimated Benchmark Turnkey Cost:</span>
                      <span className="font-semibold text-gray-800">₹{calcResult?.estimated_gross_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>PM Surya Ghar Central Subsidy (DBT):</span>
                      <span>- ₹{calcResult?.central_subsidy.toLocaleString()}</span>
                    </div>
                    {calcResult?.state_subsidy > 0 && (
                      <div className="flex justify-between text-blue-700 font-semibold">
                        <span>State Solar Incentive:</span>
                        <span>- ₹{calcResult?.state_subsidy.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-purple-200 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-gray-900">Net Cost to Homeowner:</span>
                      <span className="text-2xl font-bold text-odoo-purple">
                        ₹{calcResult?.estimated_net_cost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-purple-100 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                    <div>
                      <span className="text-gray-400 block">Est. Annual Generation:</span>
                      <strong className="text-gray-800">{calcResult?.annual_savings_units.toLocaleString()} units / yr</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Est. Annual Bill Savings:</span>
                      <strong className="text-emerald-700">₹{calcResult?.annual_bill_savings.toLocaleString()} / yr</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Subsidy Tracker Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-file-shield text-emerald-600"></i>
                <span>Your Government Subsidy Claim Tracker</span>
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                National Solar Portal tracking for your rooftop project.
              </p>

              {subsidy ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Application Number:</span>
                      <strong className="font-mono text-gray-800">{subsidy.application_no || 'Not yet applied'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Claim Status:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {subsidy.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Sanctioned CFA:</span>
                      <strong className="text-gray-800">₹{subsidy.sanctioned_amount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Disbursed (DBT):</span>
                      <strong className="text-emerald-700">₹{subsidy.disbursed_amount.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Subsidy tracker: every step with its date, reference and document */}
                  {subsidy.remarks?.startsWith('Not eligible') && (
                    <div className="p-3 mb-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">{subsidy.remarks}</div>
                  )}
                  {subsidy.status === 'REJECTED' && (
                    <div className="p-3 mb-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">Rejected: {subsidy.rejection_notes || 'see notes'}</div>
                  )}
                  <ol className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-xs">
                    {SUBSIDY_STEPS.map((step, idx) => {
                      const done = idx <= subsidyStepIndex(subsidy.status);
                      const ev = (subsidy.events || []).find((e) => e.status === step.key);
                      return (
                        <li key={step.key} className={`p-2.5 rounded-lg border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`w-6 h-6 rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'} flex items-center justify-center text-[10px] font-bold mb-1`}>
                            {done ? <i className="fa-solid fa-check"></i> : idx + 1}
                          </div>
                          <span className="text-[11px] font-semibold text-gray-800 block">{step.label}</span>
                          {ev && (
                            <span className="text-[10px] text-gray-500 block mt-0.5">
                              {ev.event_date}
                              {ev.reference_no && <> · {ev.reference_no}</>}
                              {ev.document_url && (
                                <> · <a href={ev.document_url} target="_blank" rel="noreferrer" className="underline">doc</a></>
                              )}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <i className="fa-solid fa-hourglass-start text-2xl text-gray-300 mb-2"></i>
                  <p className="font-semibold">Subsidy application will be filed upon installation agreement signing</p>
                  <p className="text-gray-400 mt-1">RoofRay Solutions liaisons with DISCOM and national portal end to end.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* SERVICE TICKET MODAL */}
      {/* ---------------------------------------------------- */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Raise After-Sales Service Ticket</h3>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleRaiseTicket} className="space-y-4">
              {selectedEquipment && (
                <div className="p-3 bg-purple-50 rounded border border-purple-100 text-xs text-purple-900">
                  <span className="font-bold">Component:</span> {selectedEquipment.product_name}
                  <br />
                  <span className="font-mono text-[11px]">Serial: {selectedEquipment.serial_number}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Inverter Error code E02 / Panel Cleaning"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Description *</label>
                <textarea
                  required
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Describe the issue, generation drop, or assistance required..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-odoo-purple"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-3 py-1.5 border border-gray-300 text-xs text-gray-700 font-medium rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-4 py-1.5 bg-odoo-purple hover:bg-odoo-purple/90 text-white font-bold text-xs rounded shadow transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-paper-plane text-[10px]"></i>
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reference Odoo Site Footer */}
      <SiteFooter />
    </div>
  );
};
