import React from 'react';

interface SplitSectionProps {
  children?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  reversed?: boolean;
  className?: string;
  id?: string;
}

export const SplitSection: React.FC<SplitSectionProps> = ({
  children,
  left,
  right,
  reversed = false,
  className = '',
  id,
}) => {
  return (
    <section id={id} className={`w-full bg-white py-16 sm:py-20 md:py-24 ${className}`}>
      <div className="max-w-[1320px] mx-auto px-6">
        {children ? (
          children
        ) : (
          <div
            className={`grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center ${
              reversed ? 'lg:grid-flow-dense' : ''
            }`}
          >
            {/* Left / Primary Text Column */}
            <div
              className={`lg:col-span-7 flex flex-col justify-center ${
                reversed ? 'lg:col-start-6' : 'lg:col-start-1'
              }`}
            >
              {left}
            </div>

            {/* Right / Visual Asset Column */}
            <div
              className={`lg:col-span-5 flex justify-center items-center ${
                reversed ? 'lg:col-start-1' : 'lg:col-start-8'
              }`}
            >
              {right}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
