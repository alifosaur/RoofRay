import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface ListViewProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedIds?: (number | string)[];
  onSelectionChange?: (ids: (number | string)[]) => void;
}

export function ListView<T extends { id: number | string }>({
  columns,
  data,
  onRowClick,
  selectedIds = [],
  onSelectionChange,
}: ListViewProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedData = [...data].sort((a: any, b: any) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    return sortAsc ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const allSelected = data.length > 0 && selectedIds.length === data.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange && onSelectionChange([]);
    } else {
      onSelectionChange && onSelectionChange(data.map((d) => d.id));
    }
  };

  const toggleSelectRow = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="bg-white border-t border-odoo-border overflow-x-auto min-h-[calc(100vh-120px)]">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-gray-50 border-b border-odoo-border text-gray-700 font-semibold sticky top-0">
          <tr>
            {onSelectionChange && (
              <th className="w-8 px-3 py-2 border-r border-gray-200">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded text-odoo-primary focus:ring-0 cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={`px-3 py-2 border-r border-gray-200 last:border-r-0 select-none ${
                  col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span>{col.header}</span>
                  {col.sortable !== false && (
                    <span className="text-gray-400 text-[10px]">
                      {sortKey === col.key ? (
                        <FontAwesomeIcon icon={sortAsc ? faSortUp : faSortDown} />
                      ) : (
                        <FontAwesomeIcon icon={faSort} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                className="text-center py-8 text-gray-400 italic"
              >
                No records found.
              </td>
            </tr>
          ) : (
            sortedData.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row)}
                className="hover:bg-purple-50/50 cursor-pointer transition-colors"
              >
                {onSelectionChange && (
                  <td className="w-8 px-3 py-2 border-r border-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onClick={(e) => toggleSelectRow(row.id, e)}
                      readOnly
                      className="rounded text-odoo-primary focus:ring-0 cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 border-r border-gray-100 last:border-r-0 text-gray-800"
                  >
                    {col.render
                      ? col.render(row)
                      : col.accessor
                      ? col.accessor(row)
                      : (row as any)[col.key] || '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

