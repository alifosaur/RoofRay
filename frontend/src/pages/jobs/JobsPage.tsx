import React, { useEffect, useState, useRef } from 'react';
import { useLiveRefresh } from '../../live/LiveEvents';
import { api } from '../../api/client';
import { ControlPanel } from '../../components/odoo/ControlPanel';
import { ListView } from '../../components/odoo/ListView';
import SignatureCanvas from 'react-signature-canvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTools,
  faPlay,
  faCamera,
  faCheckSquare,
  faSignature,
  faBolt,
  faMobileAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  // Complete job modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [powerGenerated, setPowerGenerated] = useState(true);
  const [confirmedCapacity, setConfirmedCapacity] = useState<number>(3);
  const [jobNotes, setJobNotes] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [actionError, setActionError] = useState('');

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('Installation Photo');

  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/jobs');
      setJobs(data || []);
      if (selectedJob) {
        const updated = (data || []).find((j: any) => j.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
      }
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setLoading(false);
    }
  };

  // Live: refetch when another role hands work over (SSE)
  useLiveRefresh(['job.', 'order.'], fetchJobs);

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleStartJob = async (jobId: number) => {
    try {
      setActionError('');
      await api.post(`/jobs/${jobId}/start`);
      fetchJobs();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start job');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedJob) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', photoCaption);

    try {
      setUploadingPhoto(true);
      await api.post(`/jobs/${selectedJob.id}/photos`, formData);
      const updatedJob = await api.get(`/jobs/${selectedJob.id}`);
      setSelectedJob(updatedJob);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (sigPadRef.current?.isEmpty()) {
      alert('Customer signature is required to complete installation.');
      return;
    }

    const signatureDataUrl = sigPadRef.current?.toDataURL('image/png') || '';

    try {
      setSubmittingComplete(true);
      setActionError('');
      await api.post(`/jobs/${selectedJob.id}/complete`, {
        confirmed_capacity_kw: Number(confirmedCapacity),
        power_generated_test: powerGenerated,
        customer_signature_base64: signatureDataUrl,
        customer_name: selectedJob.customer_name || 'Customer',
        notes: jobNotes,
      });
      setShowCompleteModal(false);
      fetchJobs();
      const updated = await api.get(`/jobs/${selectedJob.id}`);
      setSelectedJob(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete job');
    } finally {
      setSubmittingComplete(false);
    }
  };

  const columns = [
    {
      key: 'job_number',
      header: 'Job #',
      accessor: (row: any) => (
        <span className="font-bold text-odoo-primary font-mono">{row.job_number}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (row: any) => row.customer_name || `Customer #${row.customer_id}`,
    },
    {
      key: 'technician',
      header: 'Technician',
      accessor: (row: any) => row.technician_name || 'Assigned Crew',
    },
    {
      key: 'scheduled_date',
      header: 'Date',
      accessor: (row: any) => new Date(row.scheduled_date).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Stage',
      accessor: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800'
              : row.status === 'IN_PROGRESS'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ControlPanel
        breadcrumbs={[{ label: 'Field Service & Installation Jobs' }]}
        actions={
          <button
            onClick={() => navigate('/pwa/tech')}
            className="bg-teal-700 hover:bg-teal-800 text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <FontAwesomeIcon icon={faMobileAlt} />
            <span>Open Technician Mobile PWA</span>
          </button>
        }
      />

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="bg-white rounded border border-odoo-border shadow-xs p-4 lg:col-span-1 overflow-y-auto max-h-[82vh]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Installation Schedule ({jobs.length})
          </h2>

          <div className="space-y-2.5">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => {
                  setSelectedJob(job);
                  setConfirmedCapacity(job.capacity_kw || 3);
                }}
                className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                  selectedJob?.id === job.id
                    ? 'border-odoo-primary bg-purple-50/50 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-center font-bold">
                  <span className="text-odoo-primary">{job.job_number}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      job.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : job.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="font-semibold text-gray-800 mt-1">
                  {job.customer_name || `Customer #${job.customer_id}`}
                </div>
                <div className="text-gray-500 text-[11px] mt-0.5">
                  Scheduled: {new Date(job.scheduled_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Job Detail */}
        <div className="bg-white rounded border border-odoo-border shadow-xs p-6 lg:col-span-2">
          {selectedJob ? (
            <div>
              <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                <div>
                  <span className="text-xs uppercase text-gray-400 font-bold">Field Service Job</span>
                  <h1 className="text-xl font-bold text-gray-900">{selectedJob.job_number}</h1>
                  <p className="text-xs text-gray-600">
                    {selectedJob.customer_name} • Order #{selectedJob.order_id}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedJob.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleStartJob(selectedJob.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faPlay} />
                      <span>Start Job (On Site)</span>
                    </button>
                  )}

                  {selectedJob.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faCheckSquare} />
                      <span>Complete Installation</span>
                    </button>
                  )}
                </div>
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs mb-4">
                  {actionError}
                </div>
              )}

              {/* Status and Timesheet Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded border border-gray-200 mb-6 text-xs">
                <div>
                  <div className="text-gray-500 font-medium">Technician</div>
                  <div className="font-bold text-gray-800">{selectedJob.technician_name}</div>
                </div>
                <div>
                  <div className="text-gray-500 font-medium">Started At</div>
                  <div className="font-bold text-gray-800">
                    {selectedJob.started_at
                      ? new Date(selectedJob.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Not Started'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 font-medium">Completed At</div>
                  <div className="font-bold text-gray-800">
                    {selectedJob.completed_at
                      ? new Date(selectedJob.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'In Progress'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 font-medium">Power Generating Test</div>
                  <div className="font-bold text-gray-800 flex items-center gap-1">
                    <FontAwesomeIcon
                      icon={faBolt}
                      className={selectedJob.power_generated_test ? 'text-amber-500' : 'text-gray-400'}
                    />
                    <span>{selectedJob.power_generated_test ? 'Verified Working' : 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Photos Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCamera} className="text-odoo-primary" />
                    <span>Site Photos & Evidence ({selectedJob.photos?.length || 0})</span>
                  </h3>

                  {selectedJob.status === 'IN_PROGRESS' && (
                    <label className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1">
                      <FontAwesomeIcon icon={faCamera} />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Upload Site Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {(!selectedJob.photos || selectedJob.photos.length === 0) ? (
                  <div className="text-xs text-gray-400 py-6 border border-dashed rounded text-center">
                    No site photos uploaded yet. Upload inverter mounting, panel alignment, and earthing photos.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedJob.photos.map((photo: any) => (
                      <div key={photo.id} className="border rounded overflow-hidden shadow-xs bg-gray-50">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption}
                          className="h-28 w-full object-cover"
                        />
                        <div className="p-1.5 text-[10px] text-gray-600 truncate font-medium">
                          {photo.caption}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Signature Section */}
              {selectedJob.status === 'COMPLETED' && selectedJob.signature && (
                <div className="border border-gray-200 rounded p-4 bg-gray-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSignature} className="text-teal-600" />
                    <span>Customer Acceptance & Handover Sign-off</span>
                  </h3>
                  <div className="bg-white border rounded p-2 inline-block max-w-sm">
                    <img
                      src={selectedJob.signature.signature_base64}
                      alt="Customer Signature"
                      className="h-20"
                    />
                    <div className="text-[11px] font-semibold text-gray-700 border-t pt-1 mt-1">
                      Signed by: {selectedJob.signature.signer_name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-20 text-xs">
              Select an installation job from the schedule list on the left to view progress or complete site tasks.
            </div>
          )}
        </div>
      </div>

      {/* Complete Job Modal with Signature Canvas */}
      {showCompleteModal && selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckSquare} className="text-emerald-600" />
                <span>Complete Installation Job: {selectedJob.job_number}</span>
              </h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Confirmed System Size (kW) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={confirmedCapacity}
                  onChange={(e) => setConfirmedCapacity(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded border border-amber-200">
                <input
                  type="checkbox"
                  id="powerGenTest"
                  checked={powerGenerated}
                  onChange={(e) => setPowerGenerated(e.target.checked)}
                  className="rounded text-odoo-primary focus:ring-odoo-primary h-4 w-4"
                />
                <label htmlFor="powerGenTest" className="font-semibold text-amber-900">
                  Power Generation Test Passed (Inverter generating grid-synced power)
                </label>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Customer Signature <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded bg-white overflow-hidden">
                  <SignatureCanvas
                    ref={sigPadRef}
                    penColor="black"
                    canvasProps={{ className: 'w-full h-36 bg-gray-50' }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-gray-400">Customer signs inside the box</span>
                  <button
                    type="button"
                    onClick={() => sigPadRef.current?.clear()}
                    className="text-[10px] text-red-600 hover:underline"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Field Notes / Handover Comments</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Net-metering sync test successful, customer briefed on MCB switch"
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplete}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingComplete ? 'Saving Handover...' : 'Submit Completed Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
