import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { FormView, FormTab } from '../../components/odoo/FormView';
import { ControlPanel } from '../../components/odoo/ControlPanel';

export const LeadFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [chatter, setChatter] = useState<any[]>([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  const [checklist, setChecklist] = useState({
    shadow_free_area_sqft: 350.0,
    monthly_bill_amount: 5500.0,
    is_grid_suitable: true,
    remarks: 'Clear RCC terrace with direct sunlight exposure.',
    lost_reason: '',
  });

  const [surveySchedule, setSurveySchedule] = useState({
    technician_id: 3,
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
    notes: 'Check inverter cable run to main distribution box.',
  });

  const fetchLeadData = async () => {
    try {
      const data = await api.get<any>(`/leads/${id}`);
      setLead(data);
      const chat = await api.get<any[]>(`/leads/${id}/chatter`);
      setChatter(chat);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [id]);

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

  const handleCreateQuoteClick = () => {
    if (lead.status !== 'SURVEY_APPROVED') {
      alert('GATE ENFORCED: Site survey must be APPROVED before creating a quotation.');
      return;
    }
    navigate(`/web/quotes?lead_id=${lead.id}`);
  };

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

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[
          { label: 'CRM Leads', onClick: () => navigate('/web/crm') },
          { label: lead.name },
        ]}
      />

      <FormView
        title={lead.name}
        subtitle={`Lead #${lead.id} • ${lead.system_type}`}
        stages={stages}
        currentStage={lead.status}
        onStageClick={(st) => api.put(`/leads/${id}`, { status: st }).then(fetchLeadData)}
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
            {lead.status === 'QUALIFIED' && (
              <button
                onClick={() => setShowSurveyModal(true)}
                className="bg-odoo-accent hover:bg-odoo-accent-dark text-white px-2.5 py-1 rounded text-xs font-medium"
              >
                Schedule Survey
              </button>
            )}
            <button
              onClick={handleCreateQuoteClick}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                lead.status === 'SURVEY_APPROVED'
                  ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Quote {lead.status !== 'SURVEY_APPROVED' && '(Requires Approved Survey)'}
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
                  <option value={3}>Amit Verma (Lead Technician)</option>
                </select>
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

