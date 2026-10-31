import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface SmartButtonProps {
  icon: any;
  count: number | string;
  label: string;
  onClick?: () => void;
}

export const SmartButton: React.FC<SmartButtonProps> = ({ icon, count, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 py-1.5 border border-odoo-border rounded hover:bg-gray-50 transition-colors text-left bg-white shadow-xs"
    >
      <div className="text-odoo-primary text-base">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div>
        <div className="font-bold text-xs text-gray-900 leading-none">{count}</div>
        <div className="text-[10px] text-gray-500 font-medium leading-tight">{label}</div>
      </div>
    </button>
  );
};
