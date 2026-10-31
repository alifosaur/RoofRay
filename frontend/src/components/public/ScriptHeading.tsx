import React from 'react';

interface ScriptHeadingProps {
  children?: React.ReactNode;
  text?: string;
  variant?: 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'display';
  withTealUnderline?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span';
  className?: string;
}

export const ScriptHeading: React.FC<ScriptHeadingProps> = ({
  children,
  text,
  variant = 'dark',
  size = 'display',
  withTealUnderline = false,
  as: Component = 'h2',
  className = '',
}) => {
  const content = text || children;

  const colorClass = variant === 'white' ? 'text-white' : 'text-heading-dark';

  const sizeClasses = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl md:text-5xl',
    display: 'text-4xl sm:text-5xl md:text-6xl lg:text-[68px]',
  }[size];

  return (
    <div className={`relative inline-block ${className}`}>
      <Component
        className={`font-script ${sizeClasses} ${colorClass} tracking-wide leading-tight select-none`}
      >
        {content}
      </Component>

      {withTealUnderline && (
        <div className="w-full flex justify-end -mt-1 sm:-mt-2 pointer-events-none">
          <svg
            className="w-48 sm:w-64 md:w-80 h-3 sm:h-4 text-teal-brush -mr-2 sm:-mr-4"
            viewBox="0 0 280 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Organic rounded brush stroke with smooth curves */}
            <path
              d="M3 11.5C65 4.5 180 3.5 277 12"
              stroke="#5CC9B0"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
