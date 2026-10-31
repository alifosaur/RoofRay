import React from 'react';
import { ScriptHeading } from './ScriptHeading';
import { HappySunIllustration } from '../brand/HappySunIllustration';

export interface InfoBulletItem {
  leadIn: string;
  text: string;
}

interface InfoListProps {
  title: string;
  items: InfoBulletItem[];
  secondaryTitle?: string;
  secondaryParagraphs?: string[];
  sideIllustrationCaption?: string;
  sideIllustration?: React.ReactNode;
  className?: string;
  id?: string;
}

export const InfoList: React.FC<InfoListProps> = ({
  title,
  items,
  secondaryTitle,
  secondaryParagraphs,
  sideIllustrationCaption = 'Power from your own roof!',
  sideIllustration,
  className = '',
  id,
}) => {
  return (
    <section id={id} className={`w-full bg-white py-16 sm:py-20 md:py-24 select-text ${className}`}>
      <div className="max-w-[1320px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Script Heading & Bullet List matching Screenshot 3 */}
          <div className="lg:col-span-8 flex flex-col">
            <ScriptHeading as="h2" align="left" className="mb-6 sm:mb-8">
              {title}
            </ScriptHeading>

            {/* Bullet List with Bold Lead-in labels */}
            <ul className="space-y-3.5 mb-14 text-[16px] sm:text-[17px] text-[#212529] leading-relaxed">
              {items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2 text-xl font-bold leading-none text-[#212529] select-none">•</span>
                  <span>
                    <strong className="font-bold text-[#212529]">{item.leadIn}:</strong>{' '}
                    <span className="text-[#495057]">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Optional Secondary Section (e.g. "What if you switch?") */}
            {secondaryTitle && (
              <div className="mt-4 flex flex-col">
                <ScriptHeading as="h3" align="left" className="mb-6">
                  {secondaryTitle}
                </ScriptHeading>
                {secondaryParagraphs && (
                  <div className="space-y-4">
                    {secondaryParagraphs.map((para, pIdx) => (
                      <p key={pIdx} className="body-paragraph">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Side Illustration with handwritten script caption */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center pt-8 lg:pt-16 sticky top-24">
            {sideIllustration || (
              <HappySunIllustration caption={sideIllustrationCaption} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
