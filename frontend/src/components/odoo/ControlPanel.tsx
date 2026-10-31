import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faThLarge,
  faList,
  faCalendarAlt,
  faChartBar,
  faFilter,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

export type ViewType = 'kanban' | 'list' | 'calendar' | 'graph';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface ControlPanelProps {
  breadcrumbs: BreadcrumbItem[];
  onNew?: () => void;
  newButtonLabel?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  availableViews?: ViewType[];
  actions?: React.ReactNode;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  breadcrumbs,
  onNew,
  newButtonLabel = 'New',
  searchTerm = '',
  onSearchChange,
  currentView = 'kanban',
  onViewChange,
  availableViews = ['kanban', 'list'],
  actions,
}) => {
  return (
    <div className="bg-white border-b border-odoo-border px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-30 sticky top-11 w-full">
      {/* Left: Breadcrumbs & Action Button */}
      <div className="flex flex-wrap items-center gap-3">
        {onNew && (
          <button
            onClick={onNew}
            className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-3 py-1.5 rounded font-medium flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[11px]" />
            <span>{newButtonLabel}</span>
          </button>
        )}

        <div className="flex items-center space-x-1.5 font-medium text-gray-700 shrink-0">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-gray-400">/</span>}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="hover:text-odoo-primary hover:underline transition-colors cursor-pointer"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-900 font-semibold">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-gray-200">{actions}</div>}
      </div>

      {/* Right: Search bar & View Switcher */}
      <div className="flex items-center space-x-2.5 shrink-0 ml-auto">
        {onSearchChange && (
          <div className="relative w-48 sm:w-64">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-odoo-bg border border-odoo-border rounded focus:outline-none focus:border-odoo-primary text-xs"
            />
          </div>
        )}

        {/* View Switchers */}
        {onViewChange && availableViews.length > 1 && (
          <div className="flex items-center bg-gray-100 p-0.5 rounded border border-odoo-border">
            {availableViews.includes('kanban') && (
              <button
                onClick={() => onViewChange('kanban')}
                className={`p-1 px-2 rounded text-xs transition-colors ${
                  currentView === 'kanban'
                    ? 'bg-white text-odoo-primary shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Kanban View"
              >
                <FontAwesomeIcon icon={faThLarge} />
              </button>
            )}
            {availableViews.includes('list') && (
              <button
                onClick={() => onViewChange('list')}
                className={`p-1 px-2 rounded text-xs transition-colors ${
                  currentView === 'list'
                    ? 'bg-white text-odoo-primary shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <FontAwesomeIcon icon={faList} />
              </button>
            )}
            {availableViews.includes('calendar') && (
              <button
                onClick={() => onViewChange('calendar')}
                className={`p-1 px-2 rounded text-xs transition-colors ${
                  currentView === 'calendar'
                    ? 'bg-white text-odoo-primary shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Calendar View"
              >
                <FontAwesomeIcon icon={faCalendarAlt} />
              </button>
            )}
            {availableViews.includes('graph') && (
              <button
                onClick={() => onViewChange('graph')}
                className={`p-1 px-2 rounded text-xs transition-colors ${
                  currentView === 'graph'
                    ? 'bg-white text-odoo-primary shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Graph View"
              >
                <FontAwesomeIcon icon={faChartBar} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

