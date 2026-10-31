import React, { useState } from 'react';
import { StatusBar } from './StatusBar';
import { Chatter, AuditItem } from './Chatter';

export interface FormTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface FormViewProps {
  title: string;
  subtitle?: string;
  stages?: { key: string; label: string }[];
  currentStage?: string;
  onStageClick?: (key: string) => void;
  headerButtons?: React.ReactNode;
  smartButtons?: React.ReactNode;
  fields: React.ReactNode;
  tabs?: FormTab[];
  auditLogs?: AuditItem[];
  onAddNote?: (note: string) => void;
}

export const FormView: React.FC<FormViewProps> = ({
  title,
  subtitle,
  stages,
  currentStage,
  onStageClick,
  headerButtons,
  smartButtons,
  fields,
  tabs = [],
  auditLogs = [],
  onAddNote,
}) => {
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : '');

  return (
    <div className="bg-odoo-bg min-h-[calc(100vh-120px)] p-3 sm:p-5">
      <div className="max-w-6xl mx-auto bg-white rounded shadow-sm border border-odoo-border overflow-hidden">
        {/* Statusbar */}
        {stages && currentStage && (
          <StatusBar
            stages={stages}
            currentStage={currentStage}
            onStageClick={onStageClick}
            buttons={headerButtons}
          />
        )}

        {/* Sheet Content */}
        <div className="p-5 sm:p-7">
          {/* Top Sheet: Smart Buttons & Title */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              {subtitle && (
                <div className="text-[11px] font-semibold text-odoo-primary uppercase tracking-wider mb-0.5">
                  {subtitle}
                </div>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
            </div>

            {smartButtons && (
              <div className="flex flex-wrap items-center gap-2">{smartButtons}</div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="mb-6">{fields}</div>

          {/* Notebook Tabs */}
          {tabs.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-4">
              <div className="flex space-x-6 border-b border-gray-200 text-xs font-semibold">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2 transition-colors ${
                      activeTab === tab.id
                        ? 'text-odoo-primary border-b-2 border-odoo-primary font-bold'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="py-4">
                {tabs.find((t) => t.id === activeTab)?.content}
              </div>
            </div>
          )}
        </div>

        {/* Chatter Section */}
        {auditLogs && <Chatter logs={auditLogs} onAddNote={onAddNote} />}
      </div>
    </div>
  );
};

