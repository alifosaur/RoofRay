import React from 'react';
import { Link } from 'react-router-dom';

interface SquiggleLinkProps {
  children: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const SquiggleLink: React.FC<SquiggleLinkProps> = ({
  children,
  to,
  href,
  onClick,
  className = '',
}) => {
  const content = (
    <span className={`relative inline-block text-plum-accent font-medium group cursor-pointer ${className}`}>
      <span className="relative z-10 transition-colors group-hover:text-plum-dark">
        {children}
      </span>
      {/* Hand-drawn purple squiggle SVG underline */}
      <span
        className="absolute left-0 right-0 -bottom-1.5 w-full block overflow-visible pointer-events-none"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 140 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-2.5 text-plum-accent group-hover:text-plum transition-colors"
          preserveAspectRatio="none"
        >
          <path
            d="M2 6 Q 18 1, 35 6 T 70 6 T 105 6 T 138 6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
    </span>
  );

  if (to) {
    return <Link to={to} onClick={onClick}>{content}</Link>;
  }

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>{content}</a>;
  }

  return <span onClick={onClick}>{content}</span>;
};
