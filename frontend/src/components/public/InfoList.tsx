import React from 'react';
import { ScriptHeading } from './ScriptHeading';

export interface InfoBullet {
  leadIn?: string;
  text: string;
}

export interface InfoGroup {
  heading: string;
  bullets: InfoBullet[];
}

interface InfoListProps {
  groups?: InfoGroup[];
  mascotCaption?: string;
  className?: string;
}

export const DEFAULT_SOLAR_INFO_GROUPS: InfoGroup[] = [
  {
    heading: 'The Solar Journey:',
    bullets: [
      {
        leadIn: 'Zero-Cost Roof Assessment:',
        text: 'A certified solar surveyor evaluates your roof tilt, shadow analysis, and electrical load on-site within 48 hours.',
      },
      {
        leadIn: 'Custom 3D CAD Blueprint:',
        text: 'Engineering simulation tailored to your monthly units, maximizing daylight yield with premium mono-crystalline panels.',
      },
      {
        leadIn: 'One-Day Hassle-Free Installation:',
        text: 'Pre-fabricated aluminum mounting structures and plug-and-play IP67 wiring installed safely with zero structural roof penetration.',
      },
      {
        leadIn: 'DISCOM Net-Metering Liaisoning:',
        text: 'Our dedicated liaison desk completes utility approvals, bi-directional net-meter replacement, and grid synchronization paperwork.',
      },
      {
        leadIn: 'National Portal Subsidy Credit:',
        text: 'Direct Benefit Transfer (DBT) subsidy of up to ₹78,000 processed directly into your registered bank account without agent commissions.',
      },
    ],
  },
  {
    heading: 'What if grid power goes down?',
    bullets: [
      {
        leadIn: 'Smart Hybrid Transition:',
        text: 'On-grid and off-grid hybrid configurations swap seamlessly in 10 milliseconds to lithium storage, so you never feel a blackout or voltage flicker.',
      },
      {
        leadIn: 'Guaranteed 25-Year Reliability:',
        text: 'At SunPower, we stand behind our engineering with round-the-clock remote monitoring, comprehensive weather hazard protection, and guaranteed quick replacement SLAs.',
      },
    ],
  },
];

export const InfoList: React.FC<InfoListProps> = ({
  groups = DEFAULT_SOLAR_INFO_GROUPS,
  mascotCaption = "Power from your own roof!",
  className = '',
}) => {
  return (
    <section className={`py-16 md:py-24 bg-white ${className}`}>
      <div className="max-w-site mx-auto px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Script Headings & Bullet Lists */}
          <div className="lg:col-span-8 space-y-12">
            {groups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-6">
                
                {/* Script heading matching screenshot */}
                <ScriptHeading size="md" as="h3">
                  {group.heading}
                </ScriptHeading>

                {/* Bullets with bold lead-ins */}
                <ul className="space-y-4">
                  {group.bullets.map((b, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start text-[17px] md:text-[18px] leading-[1.8] text-body-grey"
                    >
                      <span className="text-body-grey font-bold mr-3 select-none text-xl leading-none mt-1">
                        &bull;
                      </span>
                      <span>
                        {b.leadIn && (
                          <strong className="text-heading-dark font-semibold mr-1.5">
                            {b.leadIn}
                          </strong>
                        )}
                        {b.text}
                      </span>
                    </li>
                  ))}
                </ul>

              </div>
            ))}
          </div>

          {/* Right Column: Smiling Mascot & Handwritten Script Caption */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center pt-8 lg:pt-16">
            
            {/* Friendly Smiling Mascot SVG (warm yellow/amber) */}
            <div className="relative group transition-transform hover:scale-105 duration-300">
              <svg
                width="130"
                height="130"
                viewBox="0 0 130 130"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
              >
                {/* Main cheerful face disc */}
                <circle cx="65" cy="65" r="54" fill="#F5A623" stroke="#212529" strokeWidth="4.5" />

                {/* Eyebrows */}
                <path
                  d="M42 42C46 38 52 38 56 42"
                  stroke="#212529"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M74 42C78 38 84 38 88 42"
                  stroke="#212529"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Curved Happy Eyes */}
                <path
                  d="M44 52C48 48 54 48 58 52"
                  stroke="#212529"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M72 52C76 48 82 48 86 52"
                  stroke="#212529"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Rosy blush cheeks */}
                <ellipse cx="38" cy="63" rx="7" ry="4" fill="#E67E22" fillOpacity="0.4" />
                <ellipse cx="92" cy="63" rx="7" ry="4" fill="#E67E22" fillOpacity="0.4" />

                {/* Broad warm smile */}
                <path
                  d="M47 67C53 79 77 79 83 67"
                  stroke="#212529"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                {/* Little smile corner dimples */}
                <path
                  d="M43 65C45 68 46 69 48 68"
                  stroke="#212529"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M87 65C85 68 84 69 82 68"
                  stroke="#212529"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Handwritten Caption in Caveat Brush font */}
            <p className="mt-4 font-script text-3xl sm:text-4xl text-heading-dark text-center tracking-wide select-none">
              {mascotCaption}
            </p>

          </div>

        </div>

      </div>
    </section>
  );
};
