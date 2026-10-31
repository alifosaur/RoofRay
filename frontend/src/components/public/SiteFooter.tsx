import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faEnvelope } from '@fortawesome/free-solid-svg-icons';

export const SiteFooter: React.FC = () => {
  return (
    <footer className="w-full bg-footer-bg border-t border-gray-200/80 pt-16 pb-12 text-[15px]">
      <div className="max-w-site mx-auto px-6">
        
        {/* 3 Columns Layout matching reference */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14">
          
          {/* Column 1: Useful Links (col-span-3) */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-bold text-heading-dark text-[17px]">Useful Links</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="text-body-grey hover:text-plum transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/packages" className="text-body-grey hover:text-plum transition-colors">
                  Packages & Pricing
                </Link>
              </li>
              <li>
                <Link to="/schemes" className="text-body-grey hover:text-plum transition-colors">
                  PM Surya Ghar Subsidy
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-body-grey hover:text-plum transition-colors">
                  Help & FAQs
                </Link>
              </li>
              <li>
                <Link to="/styleguide" className="text-body-grey hover:text-plum transition-colors">
                  Design Styleguide
                </Link>
              </li>
              <li>
                <span className="text-body-grey/80 cursor-default">
                  Privacy Policy
                </span>
              </li>
            </ul>
          </div>

          {/* Column 2: About us (col-span-6) */}
          <div className="md:col-span-5 lg:col-span-6 space-y-4">
            <h4 className="font-bold text-heading-dark text-[17px]">About us</h4>
            <p className="text-body-grey text-[15px] leading-relaxed text-justify">
              SunPower Solutions is a premier rooftop solar engineering platform powering over
              10,000 homes, commercial hubs, and agricultural units nationwide. We deliver
              high-efficiency On-Grid and Off-Grid hybrid solar installations with zero-hassle
              DISCOM net-metering and end-to-end national subsidy liaisoning.
            </p>
            <p className="text-body-grey text-[15px] leading-relaxed text-justify pt-1">
              With its modular engineering, clean interface, and 25-year performance warranty,
              SunPower helps households and businesses eliminate soaring power bills, build
              energy independence, and transition safely to clean solar electricity.
            </p>
          </div>

          {/* Column 3: Connect with us (col-span-3/4) */}
          <div className="md:col-span-4 lg:col-span-3 space-y-4">
            <h4 className="font-bold text-heading-dark text-[17px]">Connect with us</h4>
            
            <div className="space-y-3">
              <Link
                to="/#quote-request"
                className="flex items-center space-x-3 text-body-grey hover:text-plum transition-colors"
              >
                <FontAwesomeIcon icon={faComments} className="text-body-grey text-base w-4" />
                <span>Contact us</span>
              </Link>

              <a
                href="mailto:contact@sunpowersolutions.com"
                className="flex items-center space-x-3 text-body-grey hover:text-plum transition-colors"
              >
                <FontAwesomeIcon icon={faEnvelope} className="text-body-grey text-base w-4" />
                <span>contact@sunpowersolutions.com</span>
              </a>
            </div>

            {/* 4 Circular White Social Buttons with Grey Icons matching screenshot */}
            <div className="pt-4 flex items-center space-x-3">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-body-grey hover:text-plum hover:shadow transition-all"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z" />
                </svg>
              </a>

              {/* X / Twitter */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-body-grey hover:text-plum hover:shadow transition-all"
                aria-label="X / Twitter"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-body-grey hover:text-plum hover:shadow transition-all"
                aria-label="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                </svg>
              </a>

              {/* Website / Home */}
              <Link
                to="/"
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-body-grey hover:text-plum hover:shadow transition-all"
                aria-label="Home"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z" />
                </svg>
              </Link>
            </div>

          </div>

        </div>

        {/* Bottom divider and subtle copyright note */}
        <div className="mt-12 pt-8 border-t border-gray-300/60 flex flex-col sm:flex-row items-center justify-between text-xs text-body-grey/80">
          <p>&copy; {new Date().getFullYear()} SunPower Solutions Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Odoo-inspired solar energy management experience.</p>
        </div>

      </div>
    </footer>
  );
};
