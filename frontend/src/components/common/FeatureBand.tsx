import React from 'react';
import { ScriptHeading } from './ScriptHeading';

export interface FeatureItem {
  title: string;
  description: string;
}

interface FeatureBandProps {
  title: string;
  items: FeatureItem[];
  className?: string;
  id?: string;
}

export const FeatureBand: React.FC<FeatureBandProps> = ({
  title,
  items,
  className = '',
  id,
}) => {
  return (
    <section
      id={id}
      className={`w-full bg-[#6B4B63] text-white py-20 sm:py-24 md:py-28 select-text ${className}`}
    >
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Centered White Script Heading */}
        <div className="text-center mb-16 sm:mb-20">
          <ScriptHeading variant="white" align="center" as="h2">
            {title}
          </ScriptHeading>
        </div>

        {/* 3-Column by 2-Row Grid matching screenshot 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 lg:gap-x-16 gap-y-12 sm:gap-y-14">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col">
              <h3 className="font-bold text-white text-lg sm:text-[19px] mb-3 tracking-normal">
                {item.title}
              </h3>
              <p className="text-white/85 text-[15px] sm:text-[16px] leading-[1.75] font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
