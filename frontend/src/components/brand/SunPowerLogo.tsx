import React from 'react';

interface SunPowerLogoProps {
  variant?: 'dark' | 'white';
  className?: string;
  iconOnly?: boolean;
}

export const SunPowerLogo: React.FC<SunPowerLogoProps> = ({
  variant = 'dark',
  className = 'h-9',
  iconOnly = false,
}) => {
  const isWhite = variant === 'white';
  const plum = isWhite ? '#FFFFFF' : '#6B4B63';
  const teal = '#5CC9B0';
  const textDark = isWhite ? '#FFFFFF' : '#212529';
  const textSub = isWhite ? 'rgba(255,255,255,0.7)' : '#6C757D';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Sun & Rooftop Panel Emblem */}
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square flex-shrink-0"
        aria-hidden="true"
      >
        {/* Soft glow circle / sun disc */}
        <circle cx="22" cy="18" r="9" fill={teal} fillOpacity="0.25" />
        <circle cx="22" cy="18" r="6.5" fill={isWhite ? '#FFFFFF' : plum} />

        {/* Sun rays */}
        <path d="M22 6V9" stroke={isWhite ? '#FFFFFF' : plum} strokeWidth="2" strokeLinecap="round" />
        <path d="M30.5 10.5L28.5 12.5" stroke={teal} strokeWidth="2" strokeLinecap="round" />
        <path d="M13.5 10.5L15.5 12.5" stroke={teal} strokeWidth="2" strokeLinecap="round" />
        <path d="M34 18H31" stroke={teal} strokeWidth="2" strokeLinecap="round" />
        <path d="M13 18H10" stroke={teal} strokeWidth="2" strokeLinecap="round" />

        {/* Angled Solar Panel Grid */}
        <path
          d="M8 35L15 25H29L36 35H8Z"
          fill={isWhite ? 'rgba(255,255,255,0.15)' : '#6B4B63'}
          stroke={isWhite ? '#FFFFFF' : plum}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Grid lines */}
        <path d="M17 35L20 25" stroke={teal} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M27 35L24 25" stroke={teal} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11.5 30H32.5" stroke={teal} strokeWidth="1.4" strokeLinecap="round" />
      </svg>

      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight font-bold text-[22px]">
            <span style={{ color: plum }} className="font-extrabold">sun</span>
            <span style={{ color: textDark }} className="font-semibold">power</span>
            <span style={{ color: teal }} className="text-xl ml-0.5">•</span>
          </div>
          <span
            className="text-[9px] uppercase tracking-[0.2em] font-medium mt-0.5"
            style={{ color: textSub }}
          >
            Solar Solutions
          </span>
        </div>
      )}
    </div>
  );
};
