import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid, faGripVertical } from '@fortawesome/free-solid-svg-icons';

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
  const [draggedItemId, setDraggedItemId] = useState<number | string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (e: React.DragEvent, item: KanbanItem) => {
    isDraggingRef.current = true;
    setDraggedItemId(item.id);
    e.dataTransfer.setData('text/plain', String(item.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverColId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverColId === colId) {
        setDragOverColId(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColId(null);
    const rawId = e.dataTransfer.getData('text/plain') || (draggedItemId ? String(draggedItemId) : '');
    setDraggedItemId(null);
    if (!rawId || !onMoveItem) return;

    const sourceItem = items.find((i) => String(i.id) === String(rawId));
    if (sourceItem && sourceItem.columnId !== targetColId) {
      onMoveItem(sourceItem.id, targetColId);
    }
  };

  return (
    <div className="flex space-x-3 overflow-x-auto p-4 min-h-[calc(100vh-120px)] bg-odoo-bg select-none">
      {columns.map((col) => {
        const colItems = items.filter((i) => i.columnId === col.id);
        const colTotal = colItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const isOver = dragOverColId === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => Boolean(onMoveItem) && handleDragOver(e, col.id)}
            onDragLeave={(e) => Boolean(onMoveItem) && handleDragLeave(e, col.id)}
            onDrop={(e) => Boolean(onMoveItem) && handleDrop(e, col.id)}
            className={`w-72 shrink-0 rounded-md p-2 flex flex-col transition-all duration-150 max-h-[calc(100vh-140px)] ${
              isOver
                ? 'bg-purple-50/90 border-2 border-dashed border-[#714B67] shadow-lg ring-2 ring-[#714B67]/20'
                : 'bg-gray-100 border border-gray-200/80 shadow-xs'
            }`}
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
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[80px]">
              {isOver && (
                <div className="border border-dashed border-[#714B67] bg-[#714B67]/10 text-[#714B67] text-[11px] font-semibold rounded p-2 text-center animate-pulse">
                  Drop to move to {col.title}
                </div>
              )}

              {colItems.map((item) => {
                const isBeingDragged = draggedItemId !== null && String(draggedItemId) === String(item.id);

                return (
                  <div
                    key={item.id}
                    draggable={Boolean(onMoveItem)}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (isDraggingRef.current) return;
                      onItemClick && onItemClick(item);
                    }}
                    className={`bg-white rounded p-3 border transition-all text-xs group relative ${
                      isBeingDragged
                        ? 'opacity-35 scale-95 border-dashed border-[#714B67] shadow-inner bg-purple-50/40'
                        : 'border-gray-200 hover:border-odoo-primary/60 hover:shadow-md cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {Boolean(onMoveItem) && (
                          <FontAwesomeIcon
                            icon={faGripVertical}
                            className="text-gray-300 group-hover:text-gray-500 text-[11px] shrink-0"
                            title="Drag to move"
                          />
                        )}
                        <span className="font-semibold text-gray-900 leading-snug hover:text-odoo-primary transition-colors truncate">
                          {item.title}
                        </span>
                      </div>
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

                    {/* Card Action / Meta */}
                    {item.meta && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {item.meta}
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
                );
              })}

              {colItems.length === 0 && !isOver && (
                <div className="h-24 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-xs text-gray-400 bg-gray-50/50">
                  <span>No records</span>
                  {Boolean(onMoveItem) && (
                    <span className="text-[10px] text-gray-400 mt-0.5">Drag cards here</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
