import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
}

export interface KanbanItem {
  id: number | string;
  columnId: string;
  title: string;
  subtitle?: string;
  tags?: { label: string; color: string }[];
  amount?: number;
  priority?: boolean;
  meta?: React.ReactNode;
}

interface KanbanViewProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemClick?: (item: KanbanItem) => void;
  onMoveItem?: (itemId: number | string, newColumnId: string) => void;
  onTogglePriority?: (itemId: number | string) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  columns,
  items,
  onItemClick,
  onMoveItem,
  onTogglePriority,
}) => {
  return (
    <div className="flex space-x-3 overflow-x-auto p-4 min-h-[calc(100vh-120px)] bg-odoo-bg select-none">
      {columns.map((col) => {
        const colItems = items.filter((i) => i.columnId === col.id);
        const colTotal = colItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        return (
          <div
            key={col.id}
            className="w-72 shrink-0 bg-gray-100 rounded-md p-2 flex flex-col border border-gray-200/80 max-h-[calc(100vh-140px)]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 py-1 mb-2 font-semibold text-xs text-gray-800 border-b border-gray-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.color || 'bg-odoo-primary'}`}></span>
                <span>{col.title}</span>
                <span className="text-gray-500 font-normal">({colItems.length})</span>
              </div>
              {colTotal > 0 && (
                <span className="text-[11px] text-gray-600 font-bold">
                  ₹{colTotal >= 100000 ? `${(colTotal / 100000).toFixed(1)}L` : colTotal.toLocaleString()}
                </span>
              )}
            </div>

            {/* Column Card List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {colItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="bg-white rounded p-3 border border-gray-200 hover:border-odoo-primary/60 hover:shadow-md transition-all cursor-pointer text-xs"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-gray-900 leading-snug hover:text-odoo-primary transition-colors">
                      {item.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTogglePriority) onTogglePriority(item.id);
                      }}
                      className={`text-xs ml-1 ${item.priority ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
                    >
                      <FontAwesomeIcon icon={faStarSolid} />
                    </button>
                  </div>

                  {item.subtitle && (
                    <div className="text-gray-500 text-[11px] mt-1 line-clamp-1">{item.subtitle}</div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.color}`}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer / Meta */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    {item.amount !== undefined ? (
                      <span className="font-bold text-gray-800">₹{item.amount.toLocaleString()}</span>
                    ) : (
                      <span></span>
                    )}

                    {/* Quick Move drop or buttons */}
                    {onMoveItem && (
                      <select
                        value={item.columnId}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onMoveItem(item.id, e.target.value)}
                        className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-gray-600 focus:outline-none"
                      >
                        {columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
