import React from 'react';

interface SplitSectionProps {
  children?: React.ReactNode;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  reversed?: boolean;
  className?: string;
  containerClassName?: string;
}

export const SplitSection: React.FC<SplitSectionProps> = ({
  children,
  leftContent,
  rightContent,
  reversed = false,
  className = '',
  containerClassName = '',
}) => {
  if (children) {
    return (
      <section className={`py-16 md:py-24 bg-white ${className}`}>
        <div className={`max-w-site mx-auto px-6 ${containerClassName}`}>
          {children}
        </div>
      </section>
    );
  }

  const primaryColumn = (
    <div className={`w-full ${reversed ? 'lg:order-2' : 'lg:order-1'}`}>
      {leftContent}
    </div>
  );

  const secondaryColumn = (
    <div className={`w-full flex justify-center ${reversed ? 'lg:order-1' : 'lg:order-2'}`}>
      {rightContent}
    </div>
  );

  return (
    <section className={`py-16 md:py-24 bg-white ${className}`}>
      <div className={`max-w-site mx-auto px-6 ${containerClassName}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            {reversed ? secondaryColumn : primaryColumn}
          </div>
          <div className="lg:col-span-5">
            {reversed ? primaryColumn : secondaryColumn}
          </div>
        </div>
      </div>
    </section>
  );
};
