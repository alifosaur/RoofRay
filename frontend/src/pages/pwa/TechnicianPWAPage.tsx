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
  faTicketAlt,
  faPhone,
  faShieldAlt,
  faWrench,
  faCheck,
  faTools,
} from '@fortawesome/free-solid-svg-icons';

export const TechnicianPWAPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'jobs' | 'surveys' | 'tickets'>('jobs');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for installation job completion
  const [powerGenPassed, setPowerGenPassed] = useState(true);
  const [capacityKw, setCapacityKw] = useState<number | string>('');

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

  // Form states for warranty & service query resolution
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [partsCost, setPartsCost] = useState<number | string>('');
  const [labourCost, setLabourCost] = useState<number | string>('');
  const [resolvingTicket, setResolvingTicket] = useState(false);

  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const [jobsData, surveysData, ticketsData] = await Promise.all([
        api.get<any[]>('/jobs/my-schedule'),
        api.get<any[]>('/surveys'),
        api.get<any[]>('/tickets'),
      ]);
      setSchedule(jobsData || []);
      setSurveys(surveysData || []);
      setTickets(ticketsData || []);

      if (activeJob) {
        const found = (jobsData || []).find((j: any) => j.id === activeJob.id);
        if (found) setActiveJob(found);
      } else if (jobsData && jobsData.length > 0) {
        setActiveJob(jobsData[0]);
        setCapacityKw(jobsData[0].confirmed_capacity_kw ?? jobsData[0].capacity_kw ?? '');
      }

      if (activeSurvey) {
        const foundS = (surveysData || []).find((s: any) => s.id === activeSurvey.id);
        if (foundS) setActiveSurvey(foundS);
      } else if (surveysData && surveysData.length > 0) {
        setActiveSurvey(surveysData[0]);
      }

      if (activeTicket) {
        const foundT = (ticketsData || []).find((t: any) => t.id === activeTicket.id);
        if (foundT) setActiveTicket(foundT);
      } else if (ticketsData && ticketsData.length > 0) {
        setActiveTicket(ticketsData[0]);
      }
    } catch (err) {
      console.error('Failed to load technician data', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['survey.', 'job.', 'ticket.'], fetchSchedule);

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
        roof_direction: surveyForm.roof_direction || undefined,
        roof_tilt_deg: num(surveyForm.roof_tilt_deg),
        cable_distance_meters: num(surveyForm.cable_distance_meters),
        notes: surveyForm.notes || undefined,
        feasible: surveyForm.feasible,
      });
      alert(
        surveyForm.feasible
          ? 'Survey submitted and site marked FEASIBLE! Approved for quotation.'
          : 'Survey submitted with non-feasibility notes. Routed to sales for review.'
      );
      setSurveyForm(emptySurvey);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSurveyPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeSurvey) return;
    try {
      setUploadingPhoto(true);
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('caption', 'Site measurement photo');
        await api.post(`/surveys/${activeSurvey.id}/photos`, formData);
      }
      const updated = await api.get(`/surveys/${activeSurvey.id}`);
      setActiveSurvey(updated);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to upload survey photo');
    } finally {
      setUploadingPhoto(false);
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

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    try {
      setResolvingTicket(true);
      await api.put(`/tickets/${activeTicket.id}/resolve`, {
        resolution_notes: resolutionNotes || 'Resolved on-site by technician',
        parts_cost: Number(partsCost) || 0.0,
        labour_cost: Number(labourCost) || 0.0,
      });
      alert(`Customer Query ${activeTicket.ticket_number} marked RESOLVED!`);
      setResolutionNotes('');
      setPartsCost(0);
      setLabourCost(0);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    } finally {
      setResolvingTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col font-sans max-w-2xl mx-auto shadow-xl border-x border-gray-200">
      {/* Odoo / RoofRay Top App Bar */}
      <header className="bg-[#714B67] border-b border-[#5e3c54] px-4 py-3 flex items-center justify-between sticky top-0 z-20 text-white shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => logout().then(() => navigate('/login', { replace: true }))}
            title="Sign out"
            aria-label="Sign out"
            className="text-white/80 hover:text-white p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-1.5 text-white">
              <FontAwesomeIcon icon={faHardHat} className="text-amber-300" />
              <span>RoofRay Field Technician</span>
            </h1>
            <p className="text-[11px] text-white/70">
              {user?.full_name ? `${user.full_name} • ` : ''}On-Site Service & Installation Hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <span className="text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full font-mono font-medium">
            Online
          </span>
        </div>
      </header>

      {/* Workflow Tabs: Jobs, Surveys, and Warranty Queries */}
      <div className="bg-white border-b border-gray-200 p-2 flex gap-2 sticky top-[57px] z-10 shadow-2xs">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'jobs'
              ? 'bg-[#714B67] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FontAwesomeIcon icon={faBolt} />
          <span className="truncate">Jobs ({schedule.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('surveys')}
          className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'surveys'
              ? 'bg-[#714B67] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FontAwesomeIcon icon={faMapMarkerAlt} />
          <span className="truncate">Surveys ({surveys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tickets'
              ? 'bg-[#714B67] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FontAwesomeIcon icon={faTicketAlt} />
          <span className="truncate">Queries ({tickets.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 space-y-4 pb-12 overflow-y-auto">
        {/* ========================================================================= */}
        {/* TAB 1: INSTALLATION JOBS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'jobs' && (
          <>
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Today's Assigned Installation Jobs ({schedule.length})
              </h2>
              {schedule.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
                  No installation jobs assigned to your queue currently.
                </div>
              ) : (
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {schedule.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => {
                        setActiveJob(job);
                        setCapacityKw(job.confirmed_capacity_kw ?? job.capacity_kw ?? '');
                      }}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left border transition-all ${
                        activeJob?.id === job.id
                          ? 'bg-purple-50/80 border-[#714B67] text-[#714B67] shadow-xs ring-1 ring-[#714B67]'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#714B67]">
                        {job.job_number || `JOB-${String(job.id).padStart(4, '0')}`}
                      </div>
                      <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">
                        {job.customer_name || `Order #${job.order_id}`}
                      </div>
                      {job.site_address && (
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          📍 {job.site_address}
                        </div>
                      )}
                      <div className="text-[10px] mt-0.5 text-gray-500 font-medium">
                        {job.capacity_kw || 3} kW • {job.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {activeJob ? (
              <div className="space-y-4">
                {/* Active Job Card */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-[#714B67] font-bold uppercase tracking-wider">
                        {activeJob.job_number || `JOB-${String(activeJob.id).padStart(4, '0')}`} • Order #{activeJob.order_id}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">{activeJob.customer_name || 'Customer'}</h3>
                      {activeJob.customer_phone && (
                        <a
                          href={`tel:${activeJob.customer_phone}`}
                          className="text-xs text-[#017E84] hover:underline font-mono font-semibold block mt-0.5"
                        >
                          📞 {activeJob.customer_phone}
                        </a>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        activeJob.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : activeJob.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {activeJob.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1.5 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 w-3.5" />
                      <span className="font-medium">{activeJob.site_address || 'Address not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBolt} className="text-amber-500 w-3.5" />
                      <span>System Size: <strong>{activeJob.confirmed_capacity_kw || activeJob.capacity_kw || 3} kW Rooftop Solar</strong></span>
                    </div>
                  </div>

                  {/* Start Button if Scheduled */}
                  {activeJob.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStartJob(activeJob.id)}
                      className="w-full bg-[#714B67] hover:bg-[#583D51] active:scale-98 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-transform"
                    >
                      <FontAwesomeIcon icon={faPlay} />
                      <span>I'm on Site — Start Installation</span>
                    </button>
                  )}
                </div>

                {/* BOM and delivered serials */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs text-xs space-y-3">
                  <h4 className="font-bold uppercase tracking-wider text-gray-700">Bill of Materials</h4>
                  <ul className="space-y-1 border-b border-gray-100 pb-2">
                    {(activeJob.bom || []).map((b: any) => (
                      <li key={b.sku} className="flex justify-between text-gray-800 py-0.5">
                        <span>{b.product_name}</span>
                        <strong className="font-bold text-gray-900">× {b.quantity}</strong>
                      </li>
                    ))}
                  </ul>
                  <h4 className="font-bold uppercase tracking-wider text-gray-700 pt-1">Delivered Serial Numbers</h4>
                  {(activeJob.delivered_serials || []).length === 0 ? (
                    <p className="text-gray-400">No serialized items on this order.</p>
                  ) : (
                    <ul className="space-y-1 font-mono">
                      {activeJob.delivered_serials.map((d: any) => (
                        <li key={d.serial_no} className="flex justify-between text-gray-800 py-0.5">
                          <span>{d.serial_no} <span className="font-sans text-gray-500 text-[11px]">({d.product_name})</span></span>
                          <span className="text-emerald-700 font-semibold">{d.warranty_end ? `Warranty: ${d.warranty_end}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* In-Progress Installation Workflow */}
                {activeJob.status === 'IN_PROGRESS' && (
                  <form onSubmit={handleCompleteJob} className="space-y-4">
                    {/* Shift Timesheet */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faClock} className="text-[#714B67]" />
                          <span>Shift Hours & Timesheet</span>
                        </h4>
                        {timesheetPreview && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ⏱️ {timesheetPreview.hours}h {timesheetPreview.mins}m ({timesheetPreview.decimalHours} hrs)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 text-xs font-bold focus:border-[#714B67] focus:outline-none"
                          />
                          {activeJob.started_at && (
                            <span className="block text-[10px] text-gray-500 mt-1 truncate">
                              Clocked: {new Date(activeJob.started_at.endsWith('Z') ? activeJob.started_at : activeJob.started_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] text-gray-600 font-semibold">
                              Finish Time
                            </label>
                            <button
                              type="button"
                              onClick={handleSetFinishNow}
                              className="text-[10px] text-[#714B67] hover:underline font-bold"
                            >
                              Set to Now
                            </button>
                          </div>
                          <input
                            type="time"
                            value={finishTime}
                            onChange={(e) => setFinishTime(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-gray-900 text-xs font-bold focus:border-[#714B67] focus:outline-none"
                          />
                          {timesheetPreview?.isOvernight && (
                            <span className="block text-[10px] text-teal-700 mt-1 font-semibold">
                              🌙 Overnight shift (+1 day)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Photos */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faCamera} className="text-[#714B67]" />
                          <span>Site Photos ({activeJob.photos?.length || 0})</span>
                        </h4>

                        <label className="bg-gray-100 hover:bg-gray-200 text-[#714B67] border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors">
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
                              className="h-20 w-full object-cover rounded-lg border border-gray-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Generation Verification & Size */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Commissioning Test
                      </h4>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <span className="text-xs font-semibold text-gray-800">Power Generating Verified:</span>
                        <button
                          type="button"
                          onClick={() => setPowerGenPassed(!powerGenPassed)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            powerGenPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {powerGenPassed ? 'YES (Active)' : 'NO (Failed)'}
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Confirmed System Size (kW)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          placeholder="e.g. 3.0"
                          value={capacityKw}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setCapacityKw('');
                              return;
                            }
                            const num = parseFloat(val);
                            if (!isNaN(num) && num >= 0) {
                              setCapacityKw(val);
                            }
                          }}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 font-bold focus:border-[#714B67] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Step 3: Customer Signature Pad */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faSignature} className="text-[#017E84]" />
                          <span>Customer Sign-off</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => sigPadRef.current?.clear()}
                          className="text-[11px] text-red-600 hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-xl border border-gray-300 overflow-hidden">
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-4 rounded-xl text-base shadow-md flex items-center justify-center gap-2 transition-transform disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>{submitting ? 'Submitting Handover...' : 'Complete Job & Clock Out'}</span>
                    </button>
                  </form>
                )}

                {/* Completed Notice & Handover Record */}
                {activeJob.status === 'COMPLETED' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-lg text-emerald-600" />
                      <span>Installation Completed & Verified Live</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg space-y-2 border border-emerald-100">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Confirmed Capacity:</span>
                        <span className="font-bold text-gray-900">
                          {activeJob.confirmed_capacity_kw || activeJob.capacity_kw || 3.0} kW
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Power Generation Test:</span>
                        <span className="font-bold text-emerald-700">VERIFIED GENERATING</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Finished Clock Time:</span>
                        <span className="font-mono text-gray-800">
                          {activeJob.finished_at ? new Date(activeJob.finished_at + 'Z').toLocaleString() : 'Done'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SITE SURVEYS                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'surveys' && (
          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Assigned Site Surveys ({surveys.length})
              </h2>
              {surveys.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
                  No site surveys currently scheduled.
                </div>
              ) : (
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {surveys.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSurvey(s)}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left border transition-all ${
                        activeSurvey?.id === s.id
                          ? 'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-600 shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-700">Survey #{s.id}</div>
                      <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">
                        {s.customer_name || `Lead #${s.lead_id}`}
                      </div>
                      {s.site_address && (
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          📍 {s.site_address}
                        </div>
                      )}
                      <div className="text-[10px] mt-0.5 text-gray-500 font-medium">
                        {s.required_capacity ? `${s.required_capacity} kW` : ''} • {s.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {activeSurvey ? (
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4 text-xs text-gray-800">
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                      Site Survey Visit #{activeSurvey.id}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {activeSurvey.customer_name || `Lead #${activeSurvey.lead_id}`}
                    </h3>
                    {activeSurvey.customer_phone && (
                      <a
                        href={`tel:${activeSurvey.customer_phone}`}
                        className="text-xs text-[#017E84] hover:underline font-mono font-semibold block mt-0.5"
                      >
                        📞 {activeSurvey.customer_phone}
                      </a>
                    )}
                    <p className="text-[11px] text-gray-700 mt-1 flex items-center gap-1">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 w-3" />
                      <span className="font-medium">{activeSurvey.site_address || 'Address not provided'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Target: <strong className="text-gray-900">{activeSurvey.required_capacity} kW {activeSurvey.system_type}</strong> • Scheduled: {new Date(activeSurvey.scheduled_date).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    activeSurvey.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : activeSurvey.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {activeSurvey.status}
                  </span>
                </div>

                {activeSurvey.status === 'SCHEDULED' ? (
                  <form onSubmit={handleCompleteSurvey} className="space-y-4 text-xs">
                    <label className="flex items-center gap-2 text-gray-800 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={surveyForm.address_confirmed}
                        onChange={(e) => setSurveyForm({ ...surveyForm, address_confirmed: e.target.checked })}
                        className="w-4 h-4 rounded text-[#714B67] focus:ring-[#714B67]"
                      />
                      <span>Site address confirmed on location</span>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <label className="block text-gray-700 font-semibold">Roof length (ft)
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={surveyForm.roof_length_ft}
                          onChange={(e) => setSurveyForm({ ...surveyForm, roof_length_ft: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 focus:border-[#714B67] focus:outline-none"
                        />
                      </label>
                      <label className="block text-gray-700 font-semibold">Roof width (ft)
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={surveyForm.roof_width_ft}
                          onChange={(e) => setSurveyForm({ ...surveyForm, roof_width_ft: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 focus:border-[#714B67] focus:outline-none"
                        />
                      </label>
                      <label className="block text-gray-700 font-semibold">Shadow-free (sq ft) *
                        <input
                          type="number"
                          min="0"
                          required
                          value={surveyForm.shadow_free_area_sqft}
                          onChange={(e) => setSurveyForm({ ...surveyForm, shadow_free_area_sqft: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 focus:border-[#714B67] focus:outline-none"
                        />
                      </label>
                    </div>

                    <div>
                      <span className="block text-gray-700 font-semibold mb-1">Panels area out of shade? *</span>
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            onClick={() => setSurveyForm({ ...surveyForm, out_of_shade_zone: v })}
                            className={`flex-1 py-2 rounded-lg border font-semibold transition-colors ${
                              surveyForm.out_of_shade_zone === v
                                ? 'bg-[#714B67] text-white border-[#714B67]'
                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {v ? 'Yes, Shadow-Free' : 'No, Has Obstacles'}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        value={surveyForm.shade_notes}
                        onChange={(e) => setSurveyForm({ ...surveyForm, shade_notes: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-2 focus:border-[#714B67] focus:outline-none"
                        placeholder="Shade notes (trees, tanks, neighbouring buildings)"
                      />
                    </div>

                    <label className="block text-gray-700 font-semibold">Roof facing direction *
                      <select
                        required
                        value={surveyForm.roof_direction}
                        onChange={(e) => setSurveyForm({ ...surveyForm, roof_direction: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 focus:border-[#714B67] focus:outline-none"
                      >
                        <option value="">Select direction…</option>
                        {['South', 'South-West', 'South-East', 'East', 'West', 'North'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-gray-700 font-semibold">Roof tilt (deg) *
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="90"
                          required
                          value={surveyForm.roof_tilt_deg}
                          onChange={(e) => setSurveyForm({ ...surveyForm, roof_tilt_deg: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 font-mono focus:border-[#714B67] focus:outline-none"
                        />
                      </label>
                      <label className="block text-gray-700 font-semibold">Cable distance (m) *
                        <input
                          type="number"
                          step="1"
                          min="0"
                          required
                          value={surveyForm.cable_distance_meters}
                          onChange={(e) => setSurveyForm({ ...surveyForm, cable_distance_meters: e.target.value })}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 font-mono focus:border-[#714B67] focus:outline-none"
                        />
                      </label>
                    </div>

                    <div>
                      <span className="block text-gray-700 font-semibold mb-1">Site feasible for installation? *</span>
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            onClick={() => setSurveyForm({ ...surveyForm, feasible: v })}
                            className={`flex-1 py-2 rounded-lg border font-bold transition-colors ${
                              surveyForm.feasible === v
                                ? v
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {v ? '✓ Yes, Feasible' : '✕ No, Issue Found'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block text-gray-700 font-semibold">Notes
                      <textarea
                        rows={2}
                        value={surveyForm.notes}
                        onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mt-1 focus:border-[#714B67] focus:outline-none"
                        placeholder="Structure, parapet height, cable entry point…"
                      />
                    </label>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Site Photos ({activeSurvey.photos?.length || 0})
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handleSurveyPhoto}
                        disabled={uploadingPhoto}
                        className="text-xs text-gray-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || surveyForm.feasible === null}
                      className="w-full bg-[#714B67] hover:bg-[#583D51] text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>{submitting ? 'Submitting…' : surveyForm.feasible ? 'Submit & Approve Feasibility' : 'Submit Survey Report'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 text-xs text-gray-700">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Direction:</span>
                        <strong className="text-gray-900">{activeSurvey.roof_direction}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tilt Angle:</span>
                        <strong className="text-gray-900">{activeSurvey.roof_tilt_deg}°</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cable Distance:</span>
                        <strong className="text-gray-900">{activeSurvey.cable_distance_meters} meters</strong>
                      </div>
                    </div>
                    {activeSurvey.notes && (
                      <p className="text-[11px] text-gray-700 italic bg-gray-50 p-2.5 rounded border border-gray-200">
                        "{activeSurvey.notes}"
                      </p>
                    )}
                    {activeSurvey.status === 'APPROVED' && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                        <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Site Feasibility Approved!</span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          Sales team can now prepare and dispatch the pre-engineered quotation.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: WARRANTY & SERVICE QUERIES (CUSTOMER SUPPORT TICKETS)             */}
        {/* ========================================================================= */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Customer Warranty & Service Queries ({tickets.length})
              </h2>
              {tickets.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500 space-y-2">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-3xl text-gray-300" />
                  <p className="font-semibold text-gray-700">No active customer queries or warranty tickets.</p>
                  <p className="text-gray-400">When customers submit assistance or warranty requests, they appear here live.</p>
                </div>
              ) : (
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left border transition-all ${
                        activeTicket?.id === t.id
                          ? 'bg-purple-50/80 border-[#714B67] text-[#714B67] ring-1 ring-[#714B67] shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#714B67]">{t.ticket_number}</div>
                      <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">
                        {t.customer_name || `Customer #${t.customer_id}`}
                      </div>
                      {t.customer_address && (
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          📍 {t.customer_address}
                        </div>
                      )}
                      <div className="text-[10px] mt-0.5 flex items-center gap-1">
                        <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                          t.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                        <span className="text-gray-500 truncate max-w-[80px]">{t.subject}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {activeTicket && (
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4 text-xs text-gray-800">
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] text-[#714B67] font-bold uppercase tracking-wider">
                      Service Query #{activeTicket.ticket_number}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {activeTicket.customer_name || `Customer #${activeTicket.customer_id}`}
                    </h3>
                    {activeTicket.customer_phone && (
                      <a
                        href={`tel:${activeTicket.customer_phone}`}
                        className="text-xs text-[#017E84] hover:underline font-mono font-semibold block mt-0.5"
                      >
                        📞 {activeTicket.customer_phone}
                      </a>
                    )}
                    <p className="text-[11px] text-gray-700 mt-1 flex items-center gap-1">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 w-3" />
                      <span className="font-medium">{activeTicket.customer_address || 'Address on file'}</span>
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      activeTicket.status === 'RESOLVED' || activeTicket.status === 'CUSTOMER_CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {activeTicket.status}
                    </span>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        activeTicket.is_billable
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}>
                        {activeTicket.is_billable ? 'Billable (Out of Warranty)' : 'Under Active Warranty'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Problem Description Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faWrench} className="text-[#714B67]" />
                    <span>{activeTicket.subject}</span>
                  </h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xs">
                    {activeTicket.description}
                  </p>
                  <span className="text-[10px] text-gray-400 block pt-1">
                    Reported on {new Date(activeTicket.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Component & Warranty Metadata */}
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hardware Serial Item:</span>
                    <strong className="font-mono text-gray-900">
                      {activeTicket.serial_no || 'Entire Solar Array / System'}
                    </strong>
                  </div>
                  {activeTicket.product_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product Model:</span>
                      <strong className="text-gray-900">{activeTicket.product_name}</strong>
                    </div>
                  )}
                  {activeTicket.warranty_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Warranty Valid Until:</span>
                      <strong className="text-emerald-800">{activeTicket.warranty_end}</strong>
                    </div>
                  )}
                </div>

                {/* Resolution Workflow */}
                {activeTicket.status !== 'RESOLVED' && activeTicket.status !== 'CUSTOMER_CONFIRMED' && activeTicket.status !== 'CLOSED' ? (
                  <form onSubmit={handleResolveTicket} className="space-y-3 pt-2 border-t border-gray-100">
                    <h4 className="font-bold uppercase tracking-wider text-gray-700 text-xs flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faTools} className="text-[#714B67]" />
                      <span>Technician Service & Resolution Record</span>
                    </h4>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">
                        Field Findings & Resolution Work Performed *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="e.g. Inspected DC isolator, tightened MC4 connectors, net-metering sync test confirmed power flow..."
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-xs focus:border-[#714B67] focus:outline-none"
                      />
                    </div>

                    {activeTicket.is_billable && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            Parts / Hardware Cost (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            placeholder="0.00"
                            value={partsCost}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setPartsCost('');
                                return;
                              }
                              const num = parseFloat(val);
                              if (!isNaN(num) && num >= 0) setPartsCost(val);
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 font-semibold mb-1">
                            Labour / Service Charge (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            placeholder="0.00"
                            value={labourCost}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setLabourCost('');
                                return;
                              }
                              const num = parseFloat(val);
                              if (!isNaN(num) && num >= 0) setLabourCost(val);
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resolvingTicket}
                      className="w-full bg-[#714B67] hover:bg-[#583D51] text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      <span>{resolvingTicket ? 'Submitting Resolution...' : 'Mark Query Resolved & Complete Service'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-base" />
                      <span>Service Query Resolved & Tested</span>
                    </div>
                    {activeTicket.resolution_notes && (
                      <p className="text-[11px] text-gray-700 italic bg-white p-2 rounded border border-emerald-100">
                        "{activeTicket.resolution_notes}"
                      </p>
                    )}
                    {activeTicket.repair_cost > 0 && (
                      <div className="text-[11px] font-semibold text-gray-800 flex justify-between pt-1">
                        <span>Total Invoiced Repair Cost:</span>
                        <span>₹{activeTicket.repair_cost.toLocaleString()}</span>
                      </div>
                    )}
                    {activeTicket.resolved_at && (
                      <div className="text-[10px] text-gray-500 pt-1">
                        Resolved on {new Date(activeTicket.resolved_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
