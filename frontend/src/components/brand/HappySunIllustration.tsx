import React from 'react';

interface HappySunIllustrationProps {
  caption?: string;
  className?: string;
}

export const HappySunIllustration: React.FC<HappySunIllustrationProps> = ({
  caption = 'Power from your own roof!',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Friendly warm smiling sun illustration */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
          aria-hidden="true"
        >
          {/* Subtle Outer warm ring */}
          <circle cx="60" cy="60" r="54" stroke="#FB8500" strokeWidth="2.5" strokeDasharray="6 4" strokeOpacity="0.4" />
          
          {/* Golden Yellow Sun Face */}
          <circle cx="60" cy="60" r="46" fill="#FFB703" stroke="#212529" strokeWidth="3.2" />

          {/* Cheerful Eyes */}
          <path d="M42 50 C44 44, 52 44, 54 50" stroke="#212529" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M66 50 C68 44, 76 44, 78 50" stroke="#212529" strokeWidth="3.2" strokeLinecap="round" fill="none" />

          {/* Rosy Cheeks */}
          <circle cx="38" cy="60" r="5" fill="#FB8500" fillOpacity="0.5" />
          <circle cx="82" cy="60" r="5" fill="#FB8500" fillOpacity="0.5" />

          {/* Broad Happy Smile */}
          <path
            d="M44 65 C48 78, 72 78, 76 65"
            stroke="#212529"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="#FFFFFF"
          />
          {/* Tongue/smile accent */}
          <path
            d="M52 72 C55 76, 65 76, 68 72"
            fill="#FB8500"
            fillOpacity="0.7"
          />
        </svg>
      </div>

      {/* Handwritten script caption matching screenshot 3 */}
      {caption && (
        <span className="font-script text-3xl sm:text-4xl text-[#212529] mt-4 tracking-wide text-center">
          {caption}
        </span>
      )}
    </div>
  );
};
