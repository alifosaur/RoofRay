import React, { useEffect, useState, useRef } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../../components/common/NotificationBell';
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
  faClock,
} from '@fortawesome/free-solid-svg-icons';

export const TechnicianPWAPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'jobs' | 'surveys'>('jobs');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for installation job completion
  const [powerGenPassed, setPowerGenPassed] = useState(true);
  const [capacityKw, setCapacityKw] = useState<number>(0);

  // Time handling: Start and Finish times (HH:MM)
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const dateToTimeString = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const [startTime, setStartTime] = useState('');
  const [finishTime, setFinishTime] = useState('');

  // Auto-populate when job is in progress
  useEffect(() => {
    if (activeJob?.started_at) {
      const raw = activeJob.started_at;
      const sDate = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
      setStartTime(dateToTimeString(sDate));
    }
    setFinishTime(dateToTimeString(new Date()));
  }, [activeJob?.id, activeJob?.started_at, activeJob?.status]);

  const handleSetFinishNow = () => {
    setFinishTime(dateToTimeString(new Date()));
  };

  const timesheetPreview = React.useMemo(() => {
    if (!startTime || !finishTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [fh, fm] = finishTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(fh) || isNaN(fm)) return null;
    let startMins = sh * 60 + sm;
    let finishMins = fh * 60 + fm;
    let isOvernight = false;
    if (finishMins < startMins) {
      finishMins += 24 * 60;
      isOvernight = true;
    }
    const diff = finishMins - startMins;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const decimalHours = Math.max(0.1, Math.round((diff / 60) * 100) / 100);
    return { hours, mins, decimalHours, isOvernight };
  }, [startTime, finishTime]);

  const buildIsoTimestamps = () => {
    if (!activeJob) return { start_time: undefined, finish_time: undefined };
    const rawStarted = activeJob.started_at;
    const baseDate = rawStarted
      ? new Date(rawStarted.endsWith('Z') ? rawStarted : rawStarted + 'Z')
      : new Date();

    const [sh, sm] = (startTime || dateToTimeString(baseDate)).split(':').map(Number);
    const startDate = new Date(baseDate);
    if (!isNaN(sh) && !isNaN(sm)) {
      startDate.setHours(sh, sm, 0, 0);
    }

    const [fh, fm] = (finishTime || dateToTimeString(new Date())).split(':').map(Number);
    const finishDate = new Date(startDate);
    if (!isNaN(fh) && !isNaN(fm)) {
      finishDate.setHours(fh, fm, 0, 0);
      if (finishDate.getTime() < startDate.getTime()) {
        finishDate.setDate(finishDate.getDate() + 1);
      }
    }

    return {
      start_time: startDate.toISOString(),
      finish_time: finishDate.toISOString(),
    };
  };
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for site survey completion
  const emptySurvey = {
    address_confirmed: false,
    roof_length_ft: '',
    roof_width_ft: '',
    shadow_free_area_sqft: '',
    out_of_shade_zone: true,
    feasible: null as boolean | null,
    shade_notes: '',
    roof_direction: '',
    roof_tilt_deg: '',
    cable_distance_meters: '',
    notes: '',
  };
  const [surveyForm, setSurveyForm] = useState(emptySurvey);

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
        setCapacityKw(jobsData[0].capacity_kw || 0);
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

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['survey.', 'job.'], fetchSchedule);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const num = (v: string) => (v === '' ? undefined : Number(v));

  const handleCompleteSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurvey) return;
    try {
      setSubmitting(true);
      await api.post(`/surveys/${activeSurvey.id}/complete`, {
        address_confirmed: surveyForm.address_confirmed,
        roof_length_ft: num(surveyForm.roof_length_ft),
        roof_width_ft: num(surveyForm.roof_width_ft),
        shadow_free_area_sqft: num(surveyForm.shadow_free_area_sqft),
        out_of_shade_zone: surveyForm.out_of_shade_zone,
        shade_notes: surveyForm.shade_notes || undefined,
        roof_direction: surveyForm.roof_direction,
        roof_tilt_deg: Number(surveyForm.roof_tilt_deg),
        cable_distance_meters: Number(surveyForm.cable_distance_meters),
        notes: surveyForm.notes || undefined,
        feasible: surveyForm.feasible,
      });
      setSurveyForm(emptySurvey);
      alert(
        surveyForm.feasible
          ? 'Survey approved. The lead has moved to Survey Approved and sales can prepare the quotation.'
          : 'Survey submitted as not feasible. Sales will review it.'
      );
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSurveyPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !activeSurvey) return;
    try {
      setUploadingPhoto(true);
      for (const file of Array.from(e.target.files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('caption', 'Survey photo');
        await api.post(`/surveys/${activeSurvey.id}/photos`, fd);
      }
      setActiveSurvey(await api.get(`/surveys/${activeSurvey.id}`));
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
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
    try {
      setUploadingPhoto(true);
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caption', 'Installation photo');
        await api.post(`/jobs/${activeJob.id}/photos`, formData);
      }
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
    const { start_time, finish_time } = buildIsoTimestamps();

    try {
      setSubmitting(true);
      await api.post(`/jobs/${activeJob.id}/complete`, {
        confirmed_capacity_kw: Number(capacityKw),
        power_generating: powerGenPassed,
        signature_data: signatureDataUrl,
        customer_name: activeJob.customer_name,
        start_time,
        finish_time,
        notes: notes || undefined,
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
            onClick={() => logout().then(() => navigate('/login', { replace: true }))}
            title="Sign out"
            aria-label="Sign out"
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
        <NotificationBell />

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
                  setCapacityKw(job.confirmed_capacity_kw || job.capacity_kw || 0);
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

            {/* BOM and delivered serials (released to the technician on delivery) */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-xs space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-gray-300">Bill of materials</h4>
              <ul className="space-y-1">
                {(activeJob.bom || []).map((b: any) => (
                  <li key={b.sku} className="flex justify-between text-gray-200"><span>{b.product_name}</span><strong>× {b.quantity}</strong></li>
                ))}
              </ul>
              <h4 className="font-bold uppercase tracking-wider text-gray-300 pt-2">Delivered serial numbers</h4>
              {(activeJob.delivered_serials || []).length === 0 ? (
                <p className="text-gray-400">No serialised items on this order.</p>
              ) : (
                <ul className="space-y-1 font-mono">
                  {activeJob.delivered_serials.map((d: any) => (
                    <li key={d.serial_no} className="flex justify-between text-gray-200">
                      <span>{d.serial_no} <span className="font-sans text-gray-400">{d.product_name}</span></span>
                      <span className="text-emerald-400">{d.warranty_end ? `to ${d.warranty_end}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* In-Progress Installation Workflow */}
            {activeJob.status === 'IN_PROGRESS' && (
              <form onSubmit={handleCompleteJob} className="space-y-4">
                {/* Step 0: Shift Timesheet (Start & Finish times) */}
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faClock} className="text-amber-400" />
                      <span>Shift Hours & Timesheet</span>
                    </h4>
                    {timesheetPreview && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                        ⏱️ {timesheetPreview.hours}h {timesheetPreview.mins}m ({timesheetPreview.decimalHours} hrs)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs font-bold"
                      />
                      {activeJob.started_at && (
                        <span className="block text-[10px] text-gray-400 mt-1 truncate">
                          Clocked: {new Date(activeJob.started_at.endsWith('Z') ? activeJob.started_at : activeJob.started_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-gray-400 font-semibold">
                          Finish Time
                        </label>
                        <button
                          type="button"
                          onClick={handleSetFinishNow}
                          className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
                        >
                          Now
                        </button>
                      </div>
                      <input
                        type="time"
                        value={finishTime}
                        onChange={(e) => setFinishTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs font-bold"
                      />
                      {timesheetPreview?.isOvernight && (
                        <span className="block text-[10px] text-teal-400 mt-1">
                          🌙 Overnight shift (+1 day)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
                        multiple
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
                      Target: <strong className="text-white">{activeSurvey.required_capacity} kW {activeSurvey.system_type}</strong> • Scheduled: {new Date(activeSurvey.scheduled_date).toLocaleString()}
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
                    <label className="flex items-center gap-2 text-gray-200">
                      <input type="checkbox" checked={surveyForm.address_confirmed} onChange={(e) => setSurveyForm({ ...surveyForm, address_confirmed: e.target.checked })} className="w-4 h-4" />
                      <span>Site address confirmed on location</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block text-gray-300 font-semibold">Roof length (ft)
                        <input type="number" min="0" step="0.5" value={surveyForm.roof_length_ft} onChange={(e) => setSurveyForm({ ...surveyForm, roof_length_ft: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1" />
                      </label>
                      <label className="block text-gray-300 font-semibold">Roof width (ft)
                        <input type="number" min="0" step="0.5" value={surveyForm.roof_width_ft} onChange={(e) => setSurveyForm({ ...surveyForm, roof_width_ft: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1" />
                      </label>
                      <label className="block text-gray-300 font-semibold">Shadow-free (sq ft) *
                        <input type="number" min="0" required value={surveyForm.shadow_free_area_sqft} onChange={(e) => setSurveyForm({ ...surveyForm, shadow_free_area_sqft: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1" />
                      </label>
                    </div>
                    <div>
                      <span className="block text-gray-300 font-semibold mb-1">Panels area out of shade? *</span>
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button key={String(v)} type="button" onClick={() => setSurveyForm({ ...surveyForm, out_of_shade_zone: v })}
                            className={`flex-1 py-2 rounded-lg border ${surveyForm.out_of_shade_zone === v ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold' : 'border-slate-700 text-gray-300'}`}>
                            {v ? 'Yes' : 'No'}
                          </button>
                        ))}
                      </div>
                      <textarea rows={2} value={surveyForm.shade_notes} onChange={(e) => setSurveyForm({ ...surveyForm, shade_notes: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-2" placeholder="Shade notes (trees, tanks, neighbouring buildings)" />
                    </div>
                    <label className="block text-gray-300 font-semibold">Roof facing direction *
                      <select required value={surveyForm.roof_direction} onChange={(e) => setSurveyForm({ ...surveyForm, roof_direction: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1">
                        <option value="">Select…</option>
                        {['South', 'South-West', 'South-East', 'East', 'West', 'North'].map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-gray-300 font-semibold">Roof tilt (deg) *
                        <input type="number" step="1" min="0" max="90" required value={surveyForm.roof_tilt_deg} onChange={(e) => setSurveyForm({ ...surveyForm, roof_tilt_deg: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 font-mono" />
                      </label>
                      <label className="block text-gray-300 font-semibold">Cable distance (m) *
                        <input type="number" step="1" min="0" required value={surveyForm.cable_distance_meters} onChange={(e) => setSurveyForm({ ...surveyForm, cable_distance_meters: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 font-mono" />
                      </label>
                    </div>
                    <div>
                      <span className="block text-gray-300 font-semibold mb-1">Site feasible for installation? *</span>
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button key={String(v)} type="button" onClick={() => setSurveyForm({ ...surveyForm, feasible: v })}
                            className={`flex-1 py-2 rounded-lg border ${surveyForm.feasible === v ? (v ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold' : 'bg-rose-500 text-white border-rose-500 font-bold') : 'border-slate-700 text-gray-300'}`}>
                            {v ? 'Yes, approve survey' : 'No, send to sales'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block text-gray-300 font-semibold">Notes
                      <textarea rows={2} value={surveyForm.notes} onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1" placeholder="Structure, parapet height, cable entry point…" />
                    </label>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Site photos ({activeSurvey.photos?.length || 0})</label>
                      <input type="file" accept="image/*" capture="environment" multiple onChange={handleSurveyPhoto} disabled={uploadingPhoto} className="text-gray-300" />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || surveyForm.feasible === null}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>{submitting ? 'Submitting…' : surveyForm.feasible ? 'Submit & Approve Survey' : 'Submit Survey'}</span>
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
                      <p className="text-[11px] text-amber-400 font-semibold text-center pt-2 border-t border-slate-700">
                        Marked not feasible. Waiting for sales to review.
                      </p>
                    )}
                    {activeSurvey.status === 'APPROVED' && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-center space-y-1">
                        <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Site Feasibility Approved!</span>
                        </div>
                        <p className="text-[11px] text-gray-300">
                          Sales can now prepare the customer's quotation.
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
