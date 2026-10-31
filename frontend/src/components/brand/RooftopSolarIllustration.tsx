import React from 'react';

interface RooftopSolarIllustrationProps {
  className?: string;
}

export const RooftopSolarIllustration: React.FC<RooftopSolarIllustrationProps> = ({
  className = 'w-full h-auto',
}) => {
  return (
    <div className={`relative rounded-xl overflow-hidden shadow-subtle border border-gray-100 bg-gradient-to-br from-slate-50 via-white to-teal-50/20 p-4 sm:p-6 md:p-8 flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 600 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-full drop-shadow-sm select-none"
        aria-label="SunPower Rooftop Solar Installation Diagram"
        role="img"
      >
        <title>SunPower Rooftop Solar Installation</title>
        
        {/* Sky & Sun Glow */}
        <circle cx="480" cy="90" r="75" fill="#5CC9B0" fillOpacity="0.12" />
        <circle cx="480" cy="90" r="45" fill="#FFB703" fillOpacity="0.2" />
        <circle cx="480" cy="90" r="28" fill="#FB8500" />
        {/* Sun rays */}
        <path d="M480 42V54M480 126V138M432 90H444M516 90H528M446 56L455 65M505 115L514 124M446 124L455 115M505 65L514 56" stroke="#FB8500" strokeWidth="3" strokeLinecap="round" />

        {/* Ambient Ground */}
        <rect x="30" y="380" width="540" height="20" rx="10" fill="#E9ECEF" />
        <rect x="70" y="386" width="460" height="8" rx="4" fill="#DEE2E6" />

        {/* House Main Structure */}
        <rect x="110" y="210" width="360" height="170" rx="4" fill="#FFFFFF" stroke="#6C757D" strokeWidth="2.5" />
        
        {/* Stone Base Plinth */}
        <rect x="100" y="370" width="380" height="12" rx="2" fill="#6B4B63" />

        {/* Slanted Rooftop for Solar Panels */}
        <polygon points="70,210 290,95 510,210" fill="#495057" stroke="#343A40" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="90,205 290,105 490,205" fill="#343A40" />

        {/* 6 Photovoltaic Solar Panels on Roof with Teal Gridlines */}
        {/* Top Row */}
        <polygon points="175,185 240,150 280,150 215,185" fill="#1D2A44" stroke="#5CC9B0" strokeWidth="1.8" />
        <polygon points="225,185 290,150 330,150 265,185" fill="#1D2A44" stroke="#5CC9B0" strokeWidth="1.8" />
        <polygon points="275,185 340,150 380,150 315,185" fill="#1D2A44" stroke="#5CC9B0" strokeWidth="1.8" />

        {/* Bottom Row */}
        <polygon points="145,200 210,165 250,165 185,200" fill="#141E30" stroke="#5CC9B0" strokeWidth="1.8" />
        <polygon points="195,200 260,165 300,165 235,200" fill="#141E30" stroke="#5CC9B0" strokeWidth="1.8" />
        <polygon points="245,200 310,165 350,165 285,200" fill="#141E30" stroke="#5CC9B0" strokeWidth="1.8" />

        {/* Panel Reflections / Sunbeam sheen */}
        <line x1="200" y1="170" x2="230" y2="155" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="270" y1="170" x2="300" y2="155" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />

        {/* House Front Door */}
        <rect x="255" y="270" width="55" height="100" rx="3" fill="#6B4B63" stroke="#583D51" strokeWidth="2" />
        <circle cx="298" cy="322" r="3.5" fill="#5CC9B0" />

        {/* Windows with Sunlight reflections */}
        <rect x="145" y="245" width="60" height="55" rx="3" fill="#E8F4F8" stroke="#ADB5BD" strokeWidth="2" />
        <line x1="175" y1="245" x2="175" y2="300" stroke="#ADB5BD" strokeWidth="2" />
        <line x1="145" y1="272" x2="205" y2="272" stroke="#ADB5BD" strokeWidth="2" />

        <rect x="365" y="245" width="60" height="55" rx="3" fill="#E8F4F8" stroke="#ADB5BD" strokeWidth="2" />
        <line x1="395" y1="245" x2="395" y2="300" stroke="#ADB5BD" strokeWidth="2" />
        <line x1="365" y1="272" x2="425" y2="272" stroke="#ADB5BD" strokeWidth="2" />

        {/* Inverter Box & Net-meter on Exterior Wall */}
        <rect x="135" y="318" width="38" height="48" rx="3" fill="#F8F9FA" stroke="#6B4B63" strokeWidth="2" />
        <rect x="142" y="325" width="24" height="12" rx="1.5" fill="#1E293B" />
        <circle cx="147" cy="331" r="2" fill="#5CC9B0" />
        <text x="153" y="333" fill="#5CC9B0" fontSize="7" fontFamily="monospace" fontWeight="bold">3.2kW</text>
        <circle cx="154" cy="352" r="3" fill="#6B4B63" />

        {/* Energy Flow Conduit (dashed teal glow) */}
        <path d="M154 318 V200" stroke="#5CC9B0" strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" />
        <path d="M173 342 H220 V380" stroke="#6B4B63" strokeWidth="2" strokeDasharray="3 3" />

        {/* Garden Plant accents */}
        <ellipse cx="120" cy="370" rx="14" ry="10" fill="#5CC9B0" />
        <ellipse cx="455" cy="370" rx="14" ry="10" fill="#5CC9B0" />

        {/* Floating Stat Badge */}
        <g transform="translate(380, 310)">
          <rect width="165" height="52" rx="8" fill="#FFFFFF" stroke="#5CC9B0" strokeWidth="2" filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.06))" />
          <circle cx="28" cy="26" r="14" fill="#5CC9B0" fillOpacity="0.18" />
          <path d="M23 26L27 30L34 22" stroke="#5CC9B0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="50" y="22" fill="#212529" fontSize="13" fontWeight="bold" fontFamily="sans-serif">25-Yr Performance</text>
          <text x="50" y="38" fill="#6C757D" fontSize="11" fontFamily="sans-serif">90% Electricity Saved</text>
        </g>
      </svg>
    </div>
  );
};
