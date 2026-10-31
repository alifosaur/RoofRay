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
  const [schedule, setSchedule] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for completion
  const [powerGenPassed, setPowerGenPassed] = useState(true);
  const [capacityKw, setCapacityKw] = useState(3.0);
  const [notes, setNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/jobs/my-schedule');
      setSchedule(data || []);
      if (activeJob) {
        const found = (data || []).find((j: any) => j.id === activeJob.id);
        if (found) setActiveJob(found);
      } else if (data && data.length > 0) {
        setActiveJob(data[0]);
        setCapacityKw(data[0].capacity_kw || 3.0);
      }
    } catch (err) {
      console.error('Failed to load technician schedule', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

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
              <span>SunPower Field PWA</span>
            </h1>
            <p className="text-[11px] text-gray-400">Crew Mobile Portal</p>
          </div>
        </div>

        <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
          Online
        </span>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 pb-12 overflow-y-auto">
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
                  setCapacityKw(job.capacity_kw || 3.0);
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left border transition-all ${
                  activeJob?.id === job.id
                    ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg'
                    : 'bg-slate-800 border-slate-700 text-gray-400'
                }`}
              >
                <div className="text-xs font-bold text-amber-400">{job.job_number}</div>
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {job.customer_name || `Order #${job.order_id}`}
                </div>
                <div className="text-[10px] mt-0.5">{job.status}</div>
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
                    Order #{activeJob.order_id}
                  </span>
                  <h3 className="text-lg font-bold text-white">{activeJob.customer_name}</h3>
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
                  <span>{activeJob.site_address || 'Rooftop Site Location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faBolt} className="text-amber-400 w-3.5" />
                  <span>System Size: {activeJob.capacity_kw || 3} kW System</span>
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

            {/* Completed Notice */}
            {activeJob.status === 'COMPLETED' && (
              <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-5 text-center space-y-2">
                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-3xl" />
                <h4 className="text-base font-bold text-emerald-400">Installation Completed</h4>
                <p className="text-xs text-gray-300">
                  Timesheet recorded and customer sign-off stored. System is live and generating power!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xs">
            No installation jobs assigned for today.
          </div>
        )}
      </div>
    </div>
  );
};
