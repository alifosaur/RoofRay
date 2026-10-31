import React from 'react';

interface Stage {
  key: string;
  label: string;
}

interface StatusBarProps {
  stages: Stage[];
  currentStage: string;
  onStageClick?: (stageKey: string) => void;
  buttons?: React.ReactNode;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  stages,
  currentStage,
  onStageClick,
  buttons,
}) => {
  const currentIndex = stages.findIndex((s) => s.key === currentStage);

  return (
    <div className="bg-gray-50 border-b border-odoo-border px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
      {/* Left: Action Buttons (Confirm, Cancel, Print PDF, etc.) */}
      <div className="flex items-center space-x-2">{buttons}</div>

      {/* Right: Arrow-Shaped Stage Pipeline */}
      <div className="inline-flex items-center rounded overflow-hidden border border-gray-300">
        {stages.map((stage, idx) => {
          const isActive = stage.key === currentStage;
          const isPast = idx < currentIndex;

          return (
            <button
              key={stage.key}
              onClick={() => onStageClick && onStageClick(stage.key)}
              className={`odoo-statusbar-arrow ${isActive ? 'active' : ''} ${
                isPast ? 'past' : ''
              }`}
            >
              {stage.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
