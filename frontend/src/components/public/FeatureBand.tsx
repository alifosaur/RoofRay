import React from 'react';
import { ScriptHeading } from './ScriptHeading';

export interface FeatureCardItem {
  title: string;
  description: string;
}

interface FeatureBandProps {
  heading?: string;
  items?: FeatureCardItem[];
  className?: string;
}

export const DEFAULT_SOLAR_FEATURES: FeatureCardItem[] = [
  {
    title: 'Zero Electricity Bills',
    description:
      'Generate your own clean kilowatt-hours every day and lock in free electricity for the next 25+ years with Tier-1 mono solar panels.',
  },
  {
    title: 'Direct Govt Subsidy (PM Surya)',
    description:
      'Receive up to ₹78,000 direct bank transfer subsidy credited swiftly through the National Portal with end-to-end liaisoning handled by SunPower.',
  },
  {
    title: 'Precision German Engineering',
    description:
      'High-efficiency microinverters and heavy-gauge galvanized mounting structures engineered to withstand 160 km/h wind gusts and extreme monsoon weather.',
  },
  {
    title: 'Uninterrupted Hybrid Backup',
    description:
      'Keep your refrigerators, lights, computers, and medical equipment running through grid outages with seamless millisecond lithium battery changeover.',
  },
  {
    title: 'Smart Mobile Telemetry',
    description:
      'Monitor real-time roof generation, household consumption, grid export units, and cumulative carbon savings straight from your smartphone.',
  },
  {
    title: '25-Year Production Warranty',
    description:
      'Guaranteed 84.8% peak output retention at year 25, backed by comprehensive annual maintenance, free panel cleaning, and prompt local technician support.',
  },
];

export const FeatureBand: React.FC<FeatureBandProps> = ({
  heading = 'Why rooftop solar is your best clean investment?',
  items = DEFAULT_SOLAR_FEATURES,
  className = '',
}) => {
  return (
    <section className={`w-full bg-plum py-20 md:py-28 text-white ${className}`}>
      <div className="max-w-site mx-auto px-6">
        
        {/* Centered White Script Heading */}
        <div className="text-center mb-14 md:mb-20">
          <ScriptHeading variant="white" size="display">
            {heading}
          </ScriptHeading>
        </div>

        {/* 3x2 Responsive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 lg:gap-x-16 gap-y-12 md:gap-y-16">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col">
              <h3 className="text-white font-bold text-lg md:text-[20px] mb-3 tracking-tight">
                {item.title}
              </h3>
              <p className="text-white/85 text-[16px] md:text-[17px] leading-[1.8] font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
