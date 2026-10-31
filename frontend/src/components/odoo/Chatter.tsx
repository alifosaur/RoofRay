import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faCommentAlt, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

export interface AuditItem {
  id: number;
  action: string;
  from_status?: string;
  to_status?: string;
  notes?: string;
  user_id?: number;
  created_at: string;
}

interface ChatterProps {
  logs: AuditItem[];
  onAddNote?: (note: string) => void;
}

export const Chatter: React.FC<ChatterProps> = ({ logs, onAddNote }) => {
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState<'log' | 'notes'>('log');

  const handleSend = () => {
    if (!noteText.trim()) return;
    if (onAddNote) onAddNote(noteText.trim());
    setNoteText('');
  };

  return (
    <div className="bg-white border-t border-odoo-border p-4 text-xs">
      {/* Top action tabs */}
      <div className="flex items-center space-x-4 border-b border-gray-200 pb-2 mb-3">
        <button
          onClick={() => setActiveTab('log')}
          className={`flex items-center gap-1.5 pb-1 font-semibold transition-colors ${
            activeTab === 'log'
              ? 'text-odoo-primary border-b-2 border-odoo-primary'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <FontAwesomeIcon icon={faHistory} />
          <span>Audit Trail ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-1.5 pb-1 font-semibold transition-colors ${
            activeTab === 'notes'
              ? 'text-odoo-primary border-b-2 border-odoo-primary'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <FontAwesomeIcon icon={faCommentAlt} />
          <span>Log Internal Note</span>
        </button>
      </div>

      {/* Note input if active */}
      {activeTab === 'notes' && (
        <div className="mb-4 bg-gray-50 p-2.5 rounded border border-gray-200">
          <textarea
            placeholder="Type your note here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
            rows={2}
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={handleSend}
              className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-[10px]" />
              <span>Log Note</span>
            </button>
          </div>
        </div>
      )}

      {/* Log Feed */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-gray-400 italic text-center py-3">No activity recorded yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2.5 text-xs text-gray-700 border-l-2 border-odoo-primary/40 pl-2.5 py-0.5">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(log.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {log.notes && <p className="text-gray-600 mt-0.5">{log.notes}</p>}
                {log.from_status && log.to_status && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{log.from_status}</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-purple-100 text-odoo-primary font-semibold px-1.5 py-0.5 rounded">{log.to_status}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
