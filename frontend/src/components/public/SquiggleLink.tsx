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
    <span className={`relative inline-block font-normal text-heading-dark hover:text-plum transition-colors cursor-pointer group ${className}`}>
      <span>{children}</span>
      {/* Hand-drawn Purple SVG Squiggle Underline */}
      <svg
        className="absolute -bottom-1.5 left-0 w-full h-2 pointer-events-none text-accent-plum group-hover:text-plum transition-colors"
        viewBox="0 0 100 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M1 5.5 Q 12 1, 25 5 T 50 5.2 T 75 4.8 T 99 5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <span onClick={onClick}>{content}</span>;
};
