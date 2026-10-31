import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faEnvelope,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#F4F2F2] border-t border-gray-200/80 pt-16 pb-12 select-text">
      <div className="max-w-[1320px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14">
          {/* Column 1: Useful Links */}
          <div className="md:col-span-3 flex flex-col">
            <h4 className="font-bold text-[#212529] text-[17px] mb-5">
              Useful Links
            </h4>
            <ul className="space-y-2.5 text-[15px]">
              <li>
                <Link
                  to="/"
                  className="text-[#6B4B63] hover:text-[#583D51] hover:underline transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/packages"
                  className="text-[#6B4B63] hover:text-[#583D51] hover:underline transition-colors"
                >
                  Packages & Pricing
                </Link>
              </li>
              <li>
                <Link
                  to="/schemes"
                  className="text-[#6B4B63] hover:text-[#583D51] hover:underline transition-colors"
                >
                  Govt Schemes & Subsidies
                </Link>
              </li>
              <li>
                <Link
                  to="/help"
                  className="text-[#6B4B63] hover:text-[#583D51] hover:underline transition-colors"
                >
                  Help & FAQs
                </Link>
              </li>
              <li>
                <Link
                  to="/styleguide"
                  className="text-[#6B4B63] hover:text-[#583D51] hover:underline transition-colors"
                >
                  Design System & Styleguide
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: About us */}
          <div className="md:col-span-5 flex flex-col">
            <h4 className="font-bold text-[#212529] text-[17px] mb-5">
              About us
            </h4>
            <div className="space-y-4 text-[14.5px] text-[#495057] leading-[1.75]">
              <p>
                SunPower Solutions is an end-to-end rooftop solar engineering and installation provider powering over 40 residential and commercial rooftops each month with certified tier-1 monocrystalline technology.
              </p>
              <p>
                With 100% serial-tracked component traceability, an in-house crew of 15 certified technicians, 25-year panel performance warranties, and seamless PM Surya Ghar direct-benefit subsidy management, we deliver complete rooftop energy independence.
              </p>
            </div>
          </div>

          {/* Column 3: Connect with us */}
          <div className="md:col-span-4 flex flex-col">
            <h4 className="font-bold text-[#212529] text-[17px] mb-5">
              Connect with us
            </h4>
            <div className="space-y-3 text-[14.5px] text-[#495057] mb-6">
              <div className="flex items-center space-x-2.5">
                <FontAwesomeIcon icon={faComments} className="text-[#6B4B63] text-sm w-4" />
                <Link to="/#quote-section" className="text-[#6B4B63] hover:underline font-medium">
                  Contact our solar advisors
                </Link>
              </div>
              <div className="flex items-center space-x-2.5">
                <FontAwesomeIcon icon={faEnvelope} className="text-[#6B4B63] text-sm w-4" />
                <a href="mailto:contact@sunpower.com" className="hover:underline text-[#495057]">
                  contact@sunpower.com
                </a>
              </div>
            </div>

            {/* 4 Circular White Social Buttons matching screenshot 3 */}
            <div className="flex items-center space-x-3.5">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200/70 flex items-center justify-center text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white transition-all transform hover:-translate-y-0.5"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* X / Twitter */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200/70 flex items-center justify-center text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white transition-all transform hover:-translate-y-0.5"
                aria-label="X (Twitter)"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200/70 flex items-center justify-center text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white transition-all transform hover:-translate-y-0.5"
                aria-label="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>

              {/* Website */}
              <Link
                to="/"
                className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200/70 flex items-center justify-center text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white transition-all transform hover:-translate-y-0.5"
                aria-label="SunPower Website"
              >
                <FontAwesomeIcon icon={faGlobe} className="text-sm" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="border-t border-gray-200 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6C757D]">
          <p>© 2026 SunPower Solutions Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-medium">
            Certified ISO 9001:2015 Rooftop Solar Engineering & Operations
          </p>
        </div>
      </div>
    </footer>
  );
};
