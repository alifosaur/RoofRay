import React from 'react';

interface ScriptHeadingProps {
  children: React.ReactNode;
  underline?: boolean;
  variant?: 'dark' | 'white';
  align?: 'left' | 'center' | 'right';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export const ScriptHeading: React.FC<ScriptHeadingProps> = ({
  children,
  underline = false,
  variant = 'dark',
  align = 'left',
  className = '',
  as: Component = 'h2',
}) => {
  const isWhite = variant === 'white';
  const textColor = isWhite ? 'text-white' : 'text-[#212529]';

  const alignClass =
    align === 'center'
      ? 'text-center items-center'
      : align === 'right'
      ? 'text-right items-end'
      : 'text-left items-start';

  return (
    <div className={`relative inline-flex flex-col ${alignClass} ${className}`}>
      <Component
        className={`font-script ${textColor} text-4xl sm:text-5xl md:text-6xl lg:text-[68px] leading-[1.08] tracking-normal font-normal select-text`}
      >
        {children}
      </Component>

      {underline && (
        <div
          className={`relative w-48 sm:w-64 md:w-80 lg:w-96 -mt-1 sm:-mt-2 ${
            align === 'center' ? 'mx-auto' : 'ml-4 sm:ml-8'
          }`}
          aria-hidden="true"
        >
          {/* Hand-drawn organic teal brush stroke SVG */}
          <svg
            viewBox="0 0 320 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Tapered brush stroke with rounded caps and natural width modulation */}
            <path
              d="M6 11.5 C 50 8.5, 120 7, 180 8.5 C 230 9.8, 280 12.2, 314 13.5"
              stroke="#5CC9B0"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-95"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
