import React, { useState, useEffect } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { FormView, FormTab } from '../../components/odoo/FormView';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDolly,
  faCheckCircle,
  faBoxes,
  faCalendarAlt,
  faInfoCircle,
  faArrowRight,
  faSpinner,
  faClipboardCheck,
} from '@fortawesome/free-solid-svg-icons';

export const LeadFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [lead, setLead] = useState<any>(null);
  const [chatter, setChatter] = useState<any[]>([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  // Send Item Details to Warehouse state
  const [showSendItemsModal, setShowSendItemsModal] = useState(false);
  const [bomTemplates, setBomTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [submittingToWarehouse, setSubmittingToWarehouse] = useState(false);
  const [warehouseNotes, setWarehouseNotes] = useState('');
  // null = let the backend compute the subsidy from the schemes table
  const [subsidyAmount, setSubsidyAmount] = useState<number | null>(null);

  const [checklist, setChecklist] = useState({
    shadow_free_area_sqft: 0,
    monthly_bill_amount: 0,
    is_grid_suitable: true,
    remarks: '',
    lost_reason: '',
  });

  const [surveySchedule, setSurveySchedule] = useState({
    technician_id: 0,
    scheduled_date: '',
    notes: '',
  });
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);

  const fetchTechnicians = async () => {
    try {
      const data = (await api.get<any[]>('/users?role=technician')).filter((t) => t.is_active);
      api.get<any>('/users/technicians/availability?days=14').then((a) => setAvailability(a.technicians)).catch(() => setAvailability([]));
      if (data && data.length > 0) {
        setTechnicians(data);
        setSurveySchedule((prev) => ({
          ...prev,
          technician_id: data[0].id,
        }));
      }
    } catch (e) {
      console.warn('Failed to load technician list', e);
    }
  };

  const fetchBomTemplates = async (capacity?: number) => {
    try {
      const templates = await api.get<any[]>('/bom-templates');
      setBomTemplates(templates);
      if (templates.length > 0) {
        if (capacity) {
          const match = templates.find((t) => Math.abs(t.capacity_kw - capacity) < 0.5);
          if (match) {
            setSelectedTemplateId(match.id);
            return;
          }
        }
        setSelectedTemplateId(templates[0].id);
      }
    } catch (err) {
      console.warn('Failed to load BOM templates', err);
    }
  };

  const fetchLeadData = async () => {
    try {
      const data = await api.get<any>(`/leads/${id}`);
      setLead(data);
      fetchBomTemplates(data.required_capacity);
      const chat = await api.get<any[]>(`/leads/${id}/chatter`);
      setChatter(chat);
    } catch (err) {
      console.error(err);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['lead.', 'survey.', 'quote.'], fetchLeadData);

  useEffect(() => {
    fetchLeadData();
    fetchTechnicians();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'send_to_warehouse') {
      setShowSendItemsModal(true);
    }
  }, [location.search]);

  if (!lead) {
    return <div className="p-8 text-center text-gray-400">Loading lead...</div>;
  }

  const stages = [
    { key: 'NEW', label: 'New' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'QUALIFIED', label: 'Qualified' },
    { key: 'SURVEY_SCHEDULED', label: 'Survey Scheduled' },
    { key: 'SURVEY_APPROVED', label: 'Survey Approved' },
    { key: 'QUOTED', label: 'Quoted' },
    { key: 'WON', label: 'Won' },
  ];

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/leads/${id}/checklist`, checklist);
      setShowChecklistModal(false);
      fetchLeadData();
    } catch (err: any) {
      alert(err.message || 'Error processing checklist');
    }
  };

  const handleScheduleSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/surveys', {
        lead_id: lead.id,
        technician_id: Number(surveySchedule.technician_id),
        scheduled_date: new Date(surveySchedule.scheduled_date).toISOString(),
        notes: surveySchedule.notes,
      });
      setShowSurveyModal(false);
      fetchLeadData();
    } catch (err: any) {
      alert(err.message || 'Error scheduling survey');
    }
  };

  const handleApproveSurvey = async () => {
    if (!lead.survey) return;
    try {
      await api.post(`/surveys/${lead.survey.id}/approve`);
      alert('Site Survey Feasibility APPROVED! Lead stage has shifted to Survey Approved.');
      fetchLeadData();
    } catch (err: any) {
      alert(err.message || 'Error approving site survey');
    }
  };

  const handleSendToWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      alert('Please select a BOM template.');
      return;
    }
    setSubmittingToWarehouse(true);
    try {
      const quote = await api.post<any>('/quotes', {
        lead_id: lead.id,
        template_id: selectedTemplateId,
        subsidy_amount: subsidyAmount ?? undefined,
        notes: warehouseNotes || undefined,
      });
      setShowSendItemsModal(false);
      navigate(`/web/quotes/${quote.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    } finally {
      setSubmittingToWarehouse(false);
    }
  };

  const handleCreateQuoteClick = () => {
    if (lead.status !== 'SURVEY_APPROVED') {
      alert('GATE ENFORCED: Site survey must be APPROVED before creating a quotation according to the client and submitting to warehouse.');
      return;
    }
    navigate(`/web/quotes?lead_id=${lead.id}`);
  };

  const selectedTemplate = bomTemplates.find((t) => t.id === selectedTemplateId);

  const tabs: FormTab[] = [
    {
      id: 'checklist',
      label: 'Call Checklist',
      content: lead.call_checklist ? (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">Shadow-free Roof Area:</span>
            <span className="font-semibold text-gray-900">{lead.call_checklist.shadow_free_area_sqft} sq. ft.</span>
          </div>
          <div>
            <span className="text-gray-500 block">Monthly Electricity Bill:</span>
            <span className="font-semibold text-gray-900">₹{lead.call_checklist.monthly_bill_amount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Grid Connection Suitable:</span>
            <span className={`font-semibold ${lead.call_checklist.is_grid_suitable ? 'text-emerald-600' : 'text-red-600'}`}>
              {lead.call_checklist.is_grid_suitable ? 'Yes (Suitable)' : 'No (Unsuitable)'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Remarks:</span>
            <span className="text-gray-800">{lead.call_checklist.remarks || 'None'}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          No call checklist recorded yet.{' '}
          <button
            onClick={() => setShowChecklistModal(true)}
            className="text-odoo-primary underline font-medium hover:text-odoo-primary-dark ml-1"
          >
            Record Call Checklist Now
          </button>
        </div>
      ),
    },
    {
      id: 'customer_submission',
      label: 'Portal Submission & Roof Data',
      content: (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div>
              <span className="text-gray-500 block">Lead Source:</span>
              <span className="font-semibold text-odoo-primary uppercase">{lead.source || 'customer_portal'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Property Type:</span>
              <span className="font-semibold text-gray-900">{lead.property_type || 'Residential'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Roof Construction:</span>
              <span className="font-semibold text-gray-900">{lead.roof_type || 'Concrete / Flat'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Storey / Floor:</span>
              <span className="font-semibold text-gray-900">Floor #{lead.floor_number || 1}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Roof Orientation:</span>
              <span className="font-semibold text-emerald-700">{lead.roof_direction || 'South'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Total Roof Area:</span>
              <span className="font-bold text-gray-900">{lead.roof_area_sqft ? `${lead.roof_area_sqft} sq.ft` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Shadow-Free Zone:</span>
              <span className="font-bold text-emerald-600">{lead.shadow_free_area_sqft ? `${lead.shadow_free_area_sqft} sq.ft` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Monthly Power Bill:</span>
              <span className="font-bold text-odoo-primary">{lead.monthly_bill_amount ? `₹${lead.monthly_bill_amount.toLocaleString()}` : 'N/A'}</span>
            </div>
          </div>
          {lead.notes && (
            <div>
              <span className="text-gray-500 block font-semibold mb-1">Customer Remarks:</span>
              <div className="p-2.5 bg-purple-50/50 rounded border border-purple-100 text-gray-800">
                {lead.notes}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'notes',
      label: 'Internal Notes',
      content: <p className="text-xs text-gray-700 leading-relaxed">{lead.notes || 'No internal notes provided.'}</p>,
    },
  ];

  const isSurveyApproved =
    lead.status === 'SURVEY_APPROVED' || (lead.survey && lead.survey.status === 'APPROVED');
  const isSurveyScheduled = lead.survey && lead.survey.status === 'SCHEDULED';
  const canScheduleSurvey = !lead.survey && ['NEW', 'CONTACTED', 'QUALIFIED'].includes(lead.status);
  const isSurveySubmitted = lead.survey && lead.survey.status === 'COMPLETED';

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[
          { label: 'CRM Leads', onClick: () => navigate('/web/crm') },
          { label: lead.name },
        ]}
      />

      {/* Salesman Directive Banner for this Lead */}
      <div className="bg-gradient-to-r from-purple-50 via-purple-50/50 to-white border-b border-purple-200 px-6 py-2.5 flex items-center justify-between text-xs text-[#6B4B63]">
        <div className="flex items-center gap-2.5">
          <span className="font-bold bg-[#6B4B63] text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
            Sales Directive
          </span>
          <span className="text-[#212529]">
            Call the customer and record the checklist, schedule the site survey, approve the technician's report, then <strong>create and send the quotation</strong>.
          </span>
        </div>
      </div>

      {/* Dynamic Survey Status Alert Banners */}
      {isSurveyScheduled && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-amber-600 text-sm" />
            <span>
              Site survey scheduled for <strong>{new Date(lead.survey.scheduled_date).toLocaleString()}</strong>. Waiting for the technician to submit the survey.
            </span>
          </div>
        </div>
      )}

      {isSurveySubmitted && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-950 space-y-2">
          <div className="flex items-center justify-between">
            <strong>Survey submitted by the technician. Review and approve.</strong>
            <button
              onClick={handleApproveSurvey}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-semibold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <FontAwesomeIcon icon={faCheckCircle} />
              <span>Approve Survey</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <span>Address confirmed: <b>{lead.survey.address_confirmed ? 'Yes' : 'No'}</b></span>
            <span>Roof: <b>{lead.survey.roof_length_ft ?? '—'} × {lead.survey.roof_width_ft ?? '—'} ft</b></span>
            <span>Shadow-free: <b>{lead.survey.shadow_free_area_sqft ?? '—'} sq ft</b></span>
            <span>Out of shade: <b>{lead.survey.out_of_shade_zone ? 'Yes' : 'No'}</b></span>
            <span>Direction: <b>{lead.survey.roof_direction}</b></span>
            <span>Tilt: <b>{lead.survey.roof_tilt_deg}°</b></span>
            <span>Cable run: <b>{lead.survey.cable_distance_meters} m</b></span>
            <span>Photos: <b>{lead.survey.photos?.length || 0}</b></span>
          </div>
          {lead.survey.shade_notes && <p>Shade notes: {lead.survey.shade_notes}</p>}
          {lead.survey.notes && <p>Notes: {lead.survey.notes}</p>}
          {lead.survey.photos?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {lead.survey.photos.map((p: any) => (
                <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer">
                  <img src={p.photo_url} alt={p.caption || 'Survey photo'} className="h-16 w-16 object-cover rounded border" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {isSurveyApproved && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-sm" />
            <span>
              <strong>Site Survey Feasibility Approved!</strong> Shadow analysis and roof structure verified. Now create the quotation for the customer.
            </span>
          </div>
          <button
            onClick={() => setShowSendItemsModal(true)}
            className="bg-[#6B4B63] hover:bg-[#583D51] text-white px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FontAwesomeIcon icon={faDolly} />
            <span>Create Quotation from BOM Template</span>
          </button>
        </div>
      )}


      <FormView
        title={lead.name}
        subtitle={`Lead #${lead.id} • ${lead.system_type}`}
        stages={stages}
        currentStage={lead.status}
        onStageClick={(st) => {
          // Survey scheduling needs a technician and date, so that stage opens the form
          if (st === 'SURVEY_SCHEDULED' && canScheduleSurvey) {
            setShowSurveyModal(true);
            return;
          }
          api
            .put(`/leads/${id}`, { status: st })
            .then(fetchLeadData)
            .catch((err) => alert(err.message || 'This stage is set automatically by the workflow'));
        }}
        headerButtons={
          <>
            {!lead.call_checklist && (
              <button
                onClick={() => setShowChecklistModal(true)}
                className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-2.5 py-1 rounded text-xs font-medium"
              >
                Record Call Checklist
              </button>
            )}

            {canScheduleSurvey && (
              <button
                onClick={() => setShowSurveyModal(true)}
                className="bg-odoo-accent hover:bg-odoo-accent-dark text-white px-2.5 py-1 rounded text-xs font-medium"
              >
                Schedule Survey
              </button>
            )}

            {isSurveySubmitted && (
              <button
                onClick={handleApproveSurvey}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Approve Survey Feasibility</span>
              </button>
            )}

            {isSurveyApproved && (
              <button
                onClick={() => setShowSendItemsModal(true)}
                className="bg-[#6B4B63] hover:bg-[#583D51] text-white px-3 py-1 rounded text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faDolly} />
                <span>Create Quotation from BOM Template</span>
              </button>
            )}

            <button
              onClick={handleCreateQuoteClick}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${
                isSurveyApproved
                  ? 'border border-[#6B4B63] text-[#6B4B63] hover:bg-purple-50'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Create Quotation According to Client</span>
              {!isSurveyApproved && (
                <span className="text-[10px] opacity-75">(Requires Approved Survey)</span>
              )}
            </button>
          </>
        }
        fields={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <div>
                <label className="text-gray-500 block mb-0.5 font-medium">Phone</label>
                <div className="font-semibold text-gray-900 text-sm">{lead.phone}</div>
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 font-medium">Email</label>
                <div className="text-gray-800">{lead.email || 'N/A'}</div>
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 font-medium">Installation Address</label>
                <div className="text-gray-800 whitespace-pre-line">{lead.address}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-500 block mb-0.5 font-medium">Required Solar Capacity</label>
                <div className="font-bold text-gray-900 text-base text-odoo-primary">
                  {lead.required_capacity} kW
                </div>
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 font-medium">System Configuration</label>
                <div className="text-gray-800 font-medium">{lead.system_type}</div>
              </div>
              <div>
                <label className="text-gray-500 block mb-0.5 font-medium">Stage Status</label>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-odoo-primary">
                  {lead.status}
                </span>
                {lead.lost_reason && (
                  <div className="text-red-600 text-xs mt-1">Lost Reason: {lead.lost_reason}</div>
                )}
              </div>
            </div>
          </div>
        }
        tabs={tabs}
        auditLogs={chatter}
      />

      {/* Modal: Send Item Details Required to Warehouse */}
      {showSendItemsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-odoo-border w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="bg-[#6B4B63] text-white px-5 py-3 flex items-center justify-between font-semibold">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faDolly} className="text-white text-sm" />
                <span>Create Quotation from BOM Template</span>
              </div>
              <button onClick={() => setShowSendItemsModal(false)} className="hover:text-gray-300 text-sm">✕</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendToWarehouse} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Client & Rooftop Specs summary */}
              <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Client / Customer</span>
                  <span className="font-bold text-gray-900">{lead.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-semibold text-gray-800">{lead.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">System Target</span>
                  <span className="font-extrabold text-[#6B4B63]">{lead.required_capacity} kW {lead.system_type}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Survey Feasibility</span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    APPROVED
                  </span>
                </div>
              </div>

              {/* Select Pre-Engineered BOM Package */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Select Pre-Engineered Bill of Materials (BOM) *
                </label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-medium focus:border-[#6B4B63] focus:outline-none"
                  required
                >
                  {bomTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.capacity_kw} kW - {tpl.system_type})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Automatically matched to client's {lead.required_capacity} kW rooftop capacity.
                </span>
              </div>

              {/* Exploded Item Checklist Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-gray-800">
                    Required Installation Items ({selectedTemplate?.lines?.length || 0} Hardware Items)
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Pre-generated checklist for warehouse staging
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Component / Product Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Cost</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedTemplate?.lines && selectedTemplate.lines.length > 0 ? (
                        selectedTemplate.lines.map((line: any, idx: number) => {
                          const unitCost = line.product?.unit_cost || line.product?.list_price || 0;
                          const lineTotal = unitCost * line.quantity;
                          return (
                            <tr key={line.id || idx} className="hover:bg-gray-50/80">
                              <td className="py-2 px-3 text-gray-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                {line.product?.name || `Product #${line.product_id}`}
                                {line.product?.sku && (
                                  <span className="block text-[10px] text-gray-400 font-normal">
                                    SKU: {line.product.sku}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                                  {line.product?.category || 'Hardware'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-gray-800">
                                {line.quantity} {line.product?.uom || 'Unit'}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-600">
                                ₹{unitCost.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">
                                ₹{lineTotal.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-gray-400">
                            Loading pre-generated items checklist...
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {selectedTemplate?.lines && selectedTemplate.lines.length > 0 && (
                      <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-right">Total Hardware Stock Cost:</td>
                          <td className="py-2 px-3 text-right text-odoo-primary text-sm">
                            ₹
                            {selectedTemplate.lines
                              .reduce(
                                (acc: number, l: any) =>
                                  acc + (l.product?.unit_cost || l.product?.list_price || 0) * l.quantity,
                                0
                              )
                              .toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Subsidy and Notes Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Central Government Subsidy (PM Surya Ghar DBT) ₹
                  </label>
                  <input
                    type="number"
                    value={subsidyAmount ?? ''}
                    placeholder="Leave blank to use current scheme amounts"
                    onChange={(e) => setSubsidyAmount(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-[#6B4B63] focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Direct benefit credited to customer's DISCOM account.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Quotation Notes
                  </label>
                  <textarea
                    rows={2}
                    value={warehouseNotes}
                    onChange={(e) => setWarehouseNotes(e.target.value)}
                    placeholder="Notes printed on the quotation"
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-[#6B4B63] focus:outline-none"
                  />
                </div>
              </div>

              {/* Warehouse Workflow Explanation Note */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg flex items-start gap-2.5 text-xs text-purple-900">
                <FontAwesomeIcon icon={faInfoCircle} className="text-[#6B4B63] mt-0.5" />
                <div>
                  <span className="font-bold block">Next steps:</span>
                  Creates a DRAFT quotation with the template's BOM (adjustable on the quote). Send it to the customer, record acceptance and payment, then confirm the order: the pick list is sent to the warehouse automatically on confirmation.
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowSendItemsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50"
                  disabled={submittingToWarehouse}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingToWarehouse}
                  className="px-5 py-2 bg-[#6B4B63] hover:bg-[#583D51] text-white rounded font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingToWarehouse ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Creating quotation...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faDolly} />
                      <span>Create Quotation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl border border-odoo-border w-full max-w-md overflow-hidden text-xs">
            <div className="bg-odoo-primary text-white px-4 py-2 flex items-center justify-between font-semibold">
              <span>Sales Call Qualification Checklist</span>
              <button onClick={() => setShowChecklistModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveChecklist} className="p-4 space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Shadow-free Roof Area (sq. ft.) *</label>
                <input
                  type="number"
                  required
                  value={checklist.shadow_free_area_sqft}
                  onChange={(e) => setChecklist({ ...checklist, shadow_free_area_sqft: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Monthly Electricity Bill (₹) *</label>
                <input
                  type="number"
                  required
                  value={checklist.monthly_bill_amount}
                  onChange={(e) => setChecklist({ ...checklist, monthly_bill_amount: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Grid Connectivity Suitable? *</label>
                <select
                  value={checklist.is_grid_suitable ? 'yes' : 'no'}
                  onChange={(e) => setChecklist({ ...checklist, is_grid_suitable: e.target.value === 'yes' })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-primary focus:outline-none"
                >
                  <option value="yes">Yes - Suitable for Net Metering</option>
                  <option value="no">No - Grid Unsuitable (Marks lead LOST)</option>
                </select>
              </div>

              {!checklist.is_grid_suitable && (
                <div>
                  <label className="block font-semibold text-red-600 mb-1">Lost Reason *</label>
                  <input
                    type="text"
                    required
                    value={checklist.lost_reason}
                    onChange={(e) => setChecklist({ ...checklist, lost_reason: e.target.value })}
                    placeholder="e.g. Inadequate shadow-free space or no grid connection"
                    className="w-full border border-red-300 rounded px-2.5 py-1.5 focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={checklist.remarks}
                  onChange={(e) => setChecklist({ ...checklist, remarks: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-primary hover:bg-odoo-primary-dark text-white rounded font-medium"
                >
                  Submit & Qualify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl border border-odoo-border w-full max-w-md overflow-hidden text-xs">
            <div className="bg-odoo-accent text-white px-4 py-2 flex items-center justify-between font-semibold">
              <span>Schedule Site Survey Visit</span>
              <button onClick={() => setShowSurveyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleScheduleSurvey} className="p-4 space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Scheduled Visit Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={surveySchedule.scheduled_date}
                  onChange={(e) => setSurveySchedule({ ...surveySchedule, scheduled_date: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assigned Lead Technician *</label>
                <select
                  value={surveySchedule.technician_id}
                  onChange={(e) => setSurveySchedule({ ...surveySchedule, technician_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-accent focus:outline-none"
                >
                  {technicians.length > 0 ? (
                    technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email})
                      </option>
                    ))
                  ) : (
                    <option value={0}>No active technicians. Ask an admin to add one.</option>
                  )}
                </select>
              </div>

              {/* Availability: existing bookings for the next two weeks */}
              <div className="border border-gray-200 rounded p-2 max-h-40 overflow-y-auto">
                <span className="block font-semibold text-gray-700 mb-1">Technician calendar (next 14 days)</span>
                {availability.length === 0 && <span className="text-gray-400">No technicians.</span>}
                {availability.map((t) => (
                  <div key={t.technician_id} className={`py-1 ${t.technician_id === surveySchedule.technician_id ? 'font-semibold' : ''}`}>
                    <span className="text-gray-800">{t.name}:</span>{' '}
                    {t.bookings.length === 0 ? (
                      <span className="text-emerald-700">free</span>
                    ) : (
                      t.bookings.map((b: any) => (
                        <span key={`${b.type}-${b.id}`} className="inline-block mr-1 mb-0.5 px-1.5 rounded bg-gray-100 text-gray-700">
                          {new Date(b.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} {b.type}
                        </span>
                      ))
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Instructions for Technician</label>
                <textarea
                  rows={2}
                  value={surveySchedule.notes}
                  onChange={(e) => setSurveySchedule({ ...surveySchedule, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-accent hover:bg-odoo-accent-dark text-white rounded font-medium"
                >
                  Schedule Survey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
