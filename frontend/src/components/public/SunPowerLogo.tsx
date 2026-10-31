import React from 'react';
import { Link } from 'react-router-dom';

interface SunPowerLogoProps {
  variant?: 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  className?: string;
}

export const SunPowerLogo: React.FC<SunPowerLogoProps> = ({
  variant = 'dark',
  size = 'md',
  asLink = true,
  className = '',
}) => {
  const isWhite = variant === 'white';
  const plumColor = isWhite ? '#FFFFFF' : '#714B67';
  const tealColor = isWhite ? '#7FE3CE' : '#5CC9B0';
  const textColor = isWhite ? '#FFFFFF' : '#714B67';

  // Sizing
  const scale = size === 'sm' ? 0.8 : size === 'lg' ? 1.3 : 1;
  const width = Math.round(160 * scale);
  const height = Math.round(40 * scale);

  const logoSvg = (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none transition-transform hover:opacity-95 ${className}`}
      aria-label="SunPower Solutions"
    >
      {/* Icon: Modern Sun + Solar Cell Grid */}
      <g transform="translate(2, 4)">
        {/* Sun disk backdrop with soft glow */}
        <circle cx="16" cy="16" r="14" fill={tealColor} fillOpacity="0.22" />
        
        {/* Angled Solar Panel Grid Icon */}
        <rect
          x="7"
          y="7"
          width="18"
          height="18"
          rx="4"
          fill={plumColor}
        />
        {/* Inner grid lines of the panel */}
        <line x1="16" y1="7" x2="16" y2="25" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="7" y1="16" x2="25" y2="16" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.8" />

        {/* Dynamic Sun Ray Accent */}
        <path
          d="M26 6L30 3"
          stroke={tealColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M28 13L32 12"
          stroke={tealColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M21 2L22 -1"
          stroke={tealColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Modern Wordmark: sunpower */}
      <text
        x="42"
        y="27"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="24"
        fontWeight="800"
        letterSpacing="-0.04em"
        fill={textColor}
      >
        sun<tspan fill={isWhite ? '#FFFFFF' : '#212529'} fontWeight="400">power</tspan>
      </text>

      {/* Tiny clean superscript dot or accent in teal */}
      <circle cx="152" cy="12" r="3" fill={tealColor} />
    </svg>
  );

  if (asLink) {
    return (
      <Link to="/" className="inline-flex items-center outline-none">
        {logoSvg}
      </Link>
    );
  }

  return <div className="inline-flex items-center">{logoSvg}</div>;
};
