import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faPlay,
  faCamera,
  faCheckCircle,
  faArrowLeft,
  faMapMarkerAlt,
  faSignature,
  faHardHat,
} from '@fortawesome/free-solid-svg-icons';

export const TechnicianPWAPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'jobs' | 'surveys'>('jobs');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for installation job completion
  const [powerGenPassed, setPowerGenPassed] = useState(true);
  const [generationKw, setGenerationKw] = useState<number>(2.8);
  const [inverterSerialVerified, setInverterSerialVerified] = useState('INV-904821');
  const [capacityKw, setCapacityKw] = useState(3.0);
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for site survey completion
  const [certifyFeasibility, setCertifyFeasibility] = useState(true);
  const [surveyForm, setSurveyForm] = useState({
    roof_direction: 'South',
    roof_tilt_deg: 20.0,
    cable_distance_meters: 15.0,
    notes: 'Structure verified. RCC roof with direct sunlight and short cable run to meter.',
  });

  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const [jobsData, surveysData] = await Promise.all([
        api.get<any[]>('/jobs/my-schedule'),
        api.get<any[]>('/surveys'),
      ]);
      setSchedule(jobsData || []);
      setSurveys(surveysData || []);

      if (activeJob) {
        const found = (jobsData || []).find((j: any) => j.id === activeJob.id);
        if (found) setActiveJob(found);
      } else if (jobsData && jobsData.length > 0) {
        setActiveJob(jobsData[0]);
        setCapacityKw(jobsData[0].capacity_kw || 3.0);
      }

      if (activeSurvey) {
        const foundS = (surveysData || []).find((s: any) => s.id === activeSurvey.id);
        if (foundS) setActiveSurvey(foundS);
      } else if (surveysData && surveysData.length > 0) {
        setActiveSurvey(surveysData[0]);
      }
    } catch (err) {
      console.error('Failed to load technician data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCompleteSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurvey) return;
    try {
      setSubmitting(true);
      await api.post(`/surveys/${activeSurvey.id}/complete`, {
        roof_direction: surveyForm.roof_direction,
        roof_tilt_deg: Number(surveyForm.roof_tilt_deg),
        cable_distance_meters: Number(surveyForm.cable_distance_meters),
        notes: surveyForm.notes,
      });

      if (certifyFeasibility) {
        await api.post(`/surveys/${activeSurvey.id}/approve`);
        alert('Survey report submitted & site feasibility APPROVED! Sales team is now authorized to create the quotation and submit BOM to warehouse.');
      } else {
        alert('Survey report submitted successfully! Waiting for final sign-off.');
      }
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSurvey = async (surveyId: number) => {
    try {
      setSubmitting(true);
      await api.post(`/surveys/${surveyId}/approve`);
      alert('Site feasibility APPROVED! Sales team is now authorized to create the quotation and submit BOM to warehouse.');
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to approve survey');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartJob = async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/start`);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to start job');
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeJob) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', 'Field PWA Photo');

    try {
      setUploadingPhoto(true);
      await api.post(`/jobs/${activeJob.id}/photos`, formData);
      const updated = await api.get(`/jobs/${activeJob.id}`);
      setActiveJob(updated);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCompleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    if (sigPadRef.current?.isEmpty()) {
      alert('Please ask customer to sign before submitting.');
      return;
    }

    const signatureDataUrl = sigPadRef.current?.toDataURL('image/png') || '';

    try {
      setSubmitting(true);
      await api.post(`/jobs/${activeJob.id}/complete`, {
        confirmed_capacity_kw: Number(capacityKw),
        power_generated_test: powerGenPassed,
        customer_signature_base64: signatureDataUrl,
        customer_name: activeJob.customer_name || 'Customer',
        notes: notes,
      });
      alert('Installation job marked COMPLETED! Timesheet generated.');
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to complete job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans max-w-md mx-auto">
      {/* Mobile PWA Top App Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/web/jobs')}
            className="text-gray-400 hover:text-white p-2 rounded-lg bg-slate-700/50"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-1.5 text-amber-400">
              <FontAwesomeIcon icon={faHardHat} />
              <span>RoofRay Field PWA</span>
            </h1>
            <p className="text-[11px] text-gray-400">Crew Mobile Portal</p>
          </div>
        </div>

        <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
          Online
        </span>
      </header>

      {/* PWA Workflow Mode Selector */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-2 flex gap-2">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'jobs'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-700/60 text-gray-400 hover:text-white'
          }`}
        >
          <FontAwesomeIcon icon={faBolt} />
          <span>Installation Jobs ({schedule.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('surveys')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'surveys'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-700/60 text-gray-400 hover:text-white'
          }`}
        >
          <FontAwesomeIcon icon={faMapMarkerAlt} />
          <span>Site Surveys ({surveys.length})</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 pb-12 overflow-y-auto">
        {activeTab === 'jobs' ? (
          <>
            {/* Schedule Selector */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Today's Assigned Jobs ({schedule.length})
              </h2>
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {schedule.map((job) => (
              <button
                key={job.id}
                onClick={() => {
                  setActiveJob(job);
                  setCapacityKw(job.confirmed_capacity_kw || job.capacity_kw || 3.0);
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left border transition-all ${
                  activeJob?.id === job.id
                    ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg'
                    : 'bg-slate-800 border-slate-700 text-gray-400'
                }`}
              >
                <div className="text-xs font-bold text-amber-400">
                  {job.job_number || `JOB-${String(job.id).padStart(4, '0')}`}
                </div>
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {job.customer_name || `Order #${job.order_id}`}
                </div>
                <div className="text-[10px] mt-0.5 text-gray-300">
                  {job.capacity_kw || 3} kW • {job.status}
                </div>
              </button>
            ))}
          </div>
        </section>

        {activeJob ? (
          <div className="space-y-4">
            {/* Active Job Card */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase">
                    {activeJob.job_number || `JOB-${String(activeJob.id).padStart(4, '0')}`} • Order #{activeJob.order_id}
                  </span>
                  <h3 className="text-lg font-bold text-white">{activeJob.customer_name || 'Customer'}</h3>
                  {activeJob.customer_phone && (
                    <a
                      href={`tel:${activeJob.customer_phone}`}
                      className="text-xs text-teal-400 underline font-mono block mt-0.5"
                    >
                      {activeJob.customer_phone}
                    </a>
                  )}
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    activeJob.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : activeJob.status === 'IN_PROGRESS'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {activeJob.status}
                </span>
              </div>

              <div className="text-xs text-gray-300 space-y-1.5 pt-2 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-400 w-3.5" />
                  <span>{activeJob.site_address || 'Address not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faBolt} className="text-amber-400 w-3.5" />
                  <span>System Size: {activeJob.confirmed_capacity_kw || activeJob.capacity_kw || 3} kW Rooftop Solar</span>
                </div>
              </div>

              {/* Start Button if Scheduled */}
              {activeJob.status === 'SCHEDULED' && (
                <button
                  onClick={() => handleStartJob(activeJob.id)}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-transform"
                >
                  <FontAwesomeIcon icon={faPlay} />
                  <span>I'm on Site — Start Job</span>
                </button>
              )}
            </div>

            {/* In-Progress Installation Workflow */}
            {activeJob.status === 'IN_PROGRESS' && (
              <form onSubmit={handleCompleteJob} className="space-y-4">
                {/* Step 1: Photos */}
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCamera} className="text-amber-400" />
                      <span>Site Photos ({activeJob.photos?.length || 0})</span>
                    </h4>

                    <label className="bg-slate-700 hover:bg-slate-600 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCamera} />
                      <span>{uploadingPhoto ? 'Saving...' : 'Snap Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {activeJob.photos && activeJob.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {activeJob.photos.map((p: any) => (
                        <img
                          key={p.id}
                          src={p.photo_url}
                          alt="site"
                          className="h-20 w-full object-cover rounded-lg border border-slate-600"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Generation Verification & Size */}
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Commissioning Test
                  </h4>

                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-xs font-semibold">Power Generating Verified:</span>
                    <button
                      type="button"
                      onClick={() => setPowerGenPassed(!powerGenPassed)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        powerGenPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {powerGenPassed ? 'YES (Active)' : 'NO (Failed)'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Confirmed System Size (kW)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={capacityKw}
                      onChange={(e) => setCapacityKw(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>
                </div>

                {/* Step 3: Customer Signature Pad */}
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faSignature} className="text-teal-400" />
                      <span>Customer Sign-off</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => sigPadRef.current?.clear()}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="bg-white rounded-xl overflow-hidden">
                    <SignatureCanvas
                      ref={sigPadRef}
                      penColor="black"
                      canvasProps={{ className: 'w-full h-32' }}
                    />
                  </div>
                </div>

                {/* Step 4: Complete Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold py-4 rounded-xl text-base shadow-xl flex items-center justify-center gap-2 transition-transform disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>{submitting ? 'Submitting Handover...' : 'Complete Job & Clock Out'}</span>
                </button>
              </form>
            )}

            {/* Completed Notice & Handover Record */}
            {activeJob.status === 'COMPLETED' && (
              <div className="bg-slate-800 border border-emerald-500/50 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-lg" />
                  <span>Installation Completed & Verified Live</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl space-y-2 border border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confirmed Capacity:</span>
                    <span className="font-bold text-white">
                      {activeJob.confirmed_capacity_kw || activeJob.capacity_kw || 3.0} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Power Generation Test:</span>
                    <span className="font-bold text-emerald-400">✓ Active & Generating</span>
                  </div>
                  {activeJob.finished_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed On:</span>
                      <span className="text-gray-300">{new Date(activeJob.finished_at).toLocaleString()}</span>
                    </div>
                  )}
                  {activeJob.timesheet && (
                    <div className="flex justify-between border-t border-slate-800 pt-1.5">
                      <span className="text-gray-400">Labor Timesheet:</span>
                      <span className="text-amber-400 font-medium">
                        {activeJob.timesheet.hours} hrs @ ₹{activeJob.timesheet.hourly_rate}/hr (₹{activeJob.timesheet.total_cost})
                      </span>
                    </div>
                  )}
                </div>

                {activeJob.signature?.signature_data && (
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">
                      Customer Handover Signature ({activeJob.signature.customer_name})
                    </span>
                    <img
                      src={activeJob.signature.signature_data}
                      alt="Signature"
                      className="h-14 bg-white rounded p-1 object-contain mx-auto"
                    />
                  </div>
                )}

                {activeJob.photos && activeJob.photos.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      Site Commissioning Photos ({activeJob.photos.length})
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {activeJob.photos.map((p: any) => (
                        <img
                          key={p.id}
                          src={p.photo_url}
                          alt="Site"
                          className="h-16 w-full object-cover rounded-lg border border-slate-600"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xs">
            No installation jobs assigned for today.
          </div>
        )}
          </>
        ) : (
          /* Site Surveys Tab */
          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Assigned Site Surveys ({surveys.length})
              </h2>
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {surveys.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSurvey(s)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left border transition-all ${
                      activeSurvey?.id === s.id
                        ? 'bg-amber-950/80 border-amber-500 text-white shadow-lg'
                        : 'bg-slate-800 border-slate-700 text-gray-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-400">Survey #{s.id}</div>
                    <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                      {s.customer_name || `Lead #${s.lead_id}`}
                    </div>
                    <div className="text-[10px] mt-0.5 text-gray-300">
                      {s.required_capacity ? `${s.required_capacity} kW` : ''} • {s.status}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {activeSurvey ? (
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase">
                      Site Survey Visit #{activeSurvey.id}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {activeSurvey.customer_name || `Lead #${activeSurvey.lead_id}`}
                    </h3>
                    {activeSurvey.customer_phone && (
                      <a
                        href={`tel:${activeSurvey.customer_phone}`}
                        className="text-xs text-teal-400 underline font-mono block mt-0.5"
                      >
                        {activeSurvey.customer_phone}
                      </a>
                    )}
                    <p className="text-[11px] text-gray-300 mt-1 flex items-center gap-1">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-400 w-3" />
                      <span>{activeSurvey.site_address || 'Address not provided'}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Target: <strong className="text-white">{activeSurvey.required_capacity || 3.0} kW {activeSurvey.system_type || 'On-Grid'}</strong> • Scheduled: {new Date(activeSurvey.scheduled_date).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    activeSurvey.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : activeSurvey.status === 'COMPLETED'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {activeSurvey.status}
                  </span>
                </div>

                {activeSurvey.status === 'SCHEDULED' ? (
                  <form onSubmit={handleCompleteSurvey} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Roof Facing Direction *</label>
                      <select
                        value={surveyForm.roof_direction}
                        onChange={(e) => setSurveyForm({ ...surveyForm, roof_direction: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="South">South (Optimal Solar Yield)</option>
                        <option value="South-West">South-West</option>
                        <option value="South-East">South-East</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="North">North (High Shadowing)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Roof Tilt Angle (deg) *</label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={surveyForm.roof_tilt_deg}
                          onChange={(e) => setSurveyForm({ ...surveyForm, roof_tilt_deg: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Cable Run Distance (meters) *</label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={surveyForm.cable_distance_meters}
                          onChange={(e) => setSurveyForm({ ...surveyForm, cable_distance_meters: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Site Feasibility Notes & Structural Assessment</label>
                      <textarea
                        rows={3}
                        required
                        value={surveyForm.notes}
                        onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        placeholder="Rooftop parapet wall height, parapet shadow-free clearance, cable entry point..."
                      ></textarea>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-amber-300 font-semibold cursor-pointer p-2.5 bg-amber-950/40 rounded-lg border border-amber-800/60">
                      <input
                        type="checkbox"
                        checked={certifyFeasibility}
                        onChange={(e) => setCertifyFeasibility(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                      />
                      <span>Approve & Certify Feasibility (Unlocks Sales Quotation & Warehouse BOM)</span>
                    </label>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-transform disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>
                        {submitting
                          ? 'Processing...'
                          : certifyFeasibility
                          ? 'Submit & Approve Site Survey'
                          : 'Submit Site Survey Report'}
                      </span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 text-xs text-gray-300">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Direction:</span>
                        <strong className="text-white">{activeSurvey.roof_direction}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tilt Angle:</span>
                        <strong className="text-white">{activeSurvey.roof_tilt_deg}°</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cable Distance:</span>
                        <strong className="text-white">{activeSurvey.cable_distance_meters} meters</strong>
                      </div>
                    </div>
                    {activeSurvey.notes && (
                      <p className="text-[11px] text-gray-400 italic bg-slate-900/50 p-2.5 rounded border border-slate-700">
                        "{activeSurvey.notes}"
                      </p>
                    )}
                    {activeSurvey.status === 'COMPLETED' && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        <p className="text-[11px] text-amber-400 font-semibold text-center">
                          Survey submitted. Ready for site feasibility approval.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleApproveSurvey(activeSurvey.id)}
                          disabled={submitting}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                        >
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Approve Site Feasibility (Unlock Quotations)</span>
                        </button>
                      </div>
                    )}
                    {activeSurvey.status === 'APPROVED' && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-center space-y-1">
                        <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Site Feasibility Approved!</span>
                        </div>
                        <p className="text-[11px] text-gray-300">
                          Sales team is authorized to prepare the client quotation and submit the installation BOM checklist to the warehouse.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400 text-xs">
                No site surveys assigned right now.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
