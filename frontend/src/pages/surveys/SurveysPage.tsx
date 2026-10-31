import React, { useState, useEffect } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { ListView, ColumnDef } from '../../components/odoo/ListView';
import { useAuth } from '../../context/AuthContext';

export const SurveysPage: React.FC = () => {
  const { role } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [completeData, setCompleteData] = useState({
    roof_direction: '',
    roof_tilt_deg: 0,
    cable_distance_meters: 0,
    notes: '',
  });

  const fetchSurveys = async () => {
    try {
      const data = await api.get<any[]>('/surveys');
      setSurveys(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['survey.'], fetchSurveys);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurvey) return;
    try {
      await api.put(`/surveys/${activeSurvey.id}/complete`, completeData);
      setShowCompleteModal(false);
      fetchSurveys();
    } catch (err: any) {
      alert(err.message || 'Error completing survey');
    }
  };

  const handleApprove = async (surveyId: number) => {
    try {
      await api.post(`/surveys/${surveyId}/approve`);
      alert('Survey approved! Quotation creation is now unlocked for this lead.');
      fetchSurveys();
    } catch (err: any) {
      alert(err.message || 'Error approving survey');
    }
  };

  const handleReject = async (surveyId: number) => {
    const reason = window.prompt('Enter rejection reason (e.g. Roof structurally weak, shading too high):');
    if (!reason) return;
    try {
      await api.post(`/surveys/${surveyId}/reject?reason=${encodeURIComponent(reason)}`);
      alert('Survey marked REJECTED. Linked lead marked LOST.');
      fetchSurveys();
    } catch (err: any) {
      alert(err.message || 'Error rejecting survey');
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'id', header: 'Survey #' },
    { key: 'lead_id', header: 'Lead ID', render: (r) => `Lead #${r.lead_id}` },
    {
      key: 'scheduled_date',
      header: 'Scheduled Date',
      render: (r) => new Date(r.scheduled_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
    },
    { key: 'roof_direction', header: 'Direction', render: (r) => r.roof_direction || '-' },
    { key: 'roof_tilt_deg', header: 'Tilt Angle', render: (r) => r.roof_tilt_deg ? `${r.roof_tilt_deg}°` : '-' },
    { key: 'cable_distance_meters', header: 'Cable Run', render: (r) => r.cable_distance_meters ? `${r.cable_distance_meters} m` : '-' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const colors: Record<string, string> = {
          SCHEDULED: 'bg-amber-100 text-amber-800',
          COMPLETED: 'bg-blue-100 text-blue-800',
          APPROVED: 'bg-emerald-100 text-emerald-800 font-bold',
          REJECTED: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] ${colors[r.status] || 'bg-gray-100 text-gray-800'}`}>
            {r.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => (
        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {r.status === 'SCHEDULED' && (
            <button
              onClick={() => {
                setActiveSurvey(r);
                setShowCompleteModal(true);
              }}
              className="bg-odoo-accent hover:bg-odoo-accent-dark text-white px-2 py-0.5 rounded text-[11px]"
            >
              Complete Visit
            </button>
          )}
          {r.status === 'COMPLETED' && (role === 'admin' || role === 'sales') && (
            <div className="flex gap-1.5">
              <button
                onClick={() => handleApprove(r.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-semibold"
              >
                Approve (Unlock Quote)
              </button>
              {(role === 'admin' || role === 'sales') && (
                <button
                  onClick={() => handleReject(r.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[11px] font-semibold"
                >
                  Reject
                </button>
              )}
            </div>
          )}
          {r.status === 'APPROVED' && (
            <span className="text-emerald-600 text-[11px] font-bold">✓ Gate Passed</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Site Surveys' }]}
        searchTerm={search}
        onSearchChange={setSearch}
        currentView="list"
        availableViews={['list']}
      />

      <ListView
        columns={columns}
        data={surveys.filter((s) => s.notes?.toLowerCase().includes(search.toLowerCase()) || String(s.id).includes(search))}
        onRowClick={(r) => {
          if (r.status === 'SCHEDULED') {
            setActiveSurvey(r);
            setShowCompleteModal(true);
          }
        }}
      />

      {/* Complete Survey Modal */}
      {showCompleteModal && activeSurvey && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl border border-odoo-border w-full max-w-md overflow-hidden text-xs">
            <div className="bg-odoo-accent text-white px-4 py-2 flex items-center justify-between font-semibold">
              <span>Technician Site Survey Visit #{activeSurvey.id}</span>
              <button onClick={() => setShowCompleteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleComplete} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Roof Direction *</label>
                  <select
                    value={completeData.roof_direction}
                    onChange={(e) => setCompleteData({ ...completeData, roof_direction: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-accent focus:outline-none"
                  >
                    <option value="South">South (Optimal)</option>
                    <option value="South-East">South-East</option>
                    <option value="South-West">South-West</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Roof Tilt (° Deg) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={completeData.roof_tilt_deg}
                    onChange={(e) => setCompleteData({ ...completeData, roof_tilt_deg: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-odoo-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">DC Cable Distance to Inverter (Meters) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={completeData.cable_distance_meters}
                  onChange={(e) => setCompleteData({ ...completeData, cable_distance_meters: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Technician Findings & Notes</label>
                <textarea
                  rows={2}
                  value={completeData.notes}
                  onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:border-odoo-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-odoo-accent hover:bg-odoo-accent-dark text-white rounded font-medium"
                >
                  Submit Survey Findings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

