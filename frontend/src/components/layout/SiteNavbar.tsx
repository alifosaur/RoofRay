import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleHomePath } from '../../context/AuthContext';
import { SunPowerLogo } from '../brand/SunPowerLogo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faBars,
  faTimes,
  faUser,
  faTachometerAlt,
  faSignOutAlt,
  faSolarPanel,
} from '@fortawesome/free-solid-svg-icons';

export const SiteNavbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format name in screenshot style: "First.L" or full name
  const formattedName = user?.full_name
    ? user.full_name.includes(' ')
      ? `${user.full_name.split(' ')[0]}.${user.full_name.split(' ')[1][0]}`
      : user.full_name
    : 'My Account';

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Packages', path: '/packages' },
    { label: 'Govt Schemes', path: '/schemes' },
    { label: 'Help', path: '/help' },
    { label: 'My Account', path: user ? '/customer' : '/login' },
  ];

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const handleDashboardRedirect = () => {
    setDropdownOpen(false);
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(getRoleHomePath(role));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xs border-b border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className="max-w-[1320px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: SunPower Logo + Desktop Nav links */}
        <div className="flex items-center space-x-8 sm:space-x-12">
          <Link to="/" className="flex items-center focus:outline-none">
            <SunPowerLogo className="h-8 sm:h-9" />
          </Link>

          {/* Desktop Nav Links matching Screenshot 1 */}
          <nav className="hidden md:flex items-center space-x-7">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-[15px] font-normal transition-colors py-1 ${
                    isActive
                      ? 'text-[#212529] font-medium'
                      : 'text-[#6C757D] hover:text-[#6B4B63]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User Profile with Caret dropdown matching Screenshot 1 */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 text-[15px] text-[#212529] hover:text-[#6B4B63] font-medium px-2 py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-plum/20"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span>{formattedName}</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-[10px] text-gray-500 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-[#6C757D]">Signed in as</p>
                    <p className="text-sm font-bold text-[#212529] truncate">{user.email}</p>
                    <span className="inline-block mt-1 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-plum/10 text-plum font-bold">
                      {role}
                    </span>
                  </div>

                  <button
                    onClick={handleDashboardRedirect}
                    className="w-full text-left px-4 py-2 text-sm text-[#212529] hover:bg-gray-50 flex items-center space-x-2.5 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTachometerAlt} className="text-[#6B4B63] w-4" />
                    <span>{role === 'customer' ? 'Customer Portal' : 'Staff Workspace'}</span>
                  </button>

                  <Link
                    to="/customer"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-[#212529] hover:bg-gray-50 flex items-center space-x-2.5 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSolarPanel} className="text-[#6B4B63] w-4" />
                    <span>My Solar Projects</span>
                  </Link>

                  <div className="border-t border-gray-100 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-[15px] font-medium text-[#212529] hover:text-[#6B4B63] px-3 py-1.5 rounded transition-colors"
              >
                Login / Register
              </Link>
              <Link
                to="/#quote-section"
                className="hidden sm:inline-flex items-center justify-center bg-[#6B4B63] hover:bg-[#583D51] text-white text-[14px] font-medium px-4 py-2 rounded transition-colors shadow-xs"
              >
                Get a Quote
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-plum rounded focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-gray-700 hover:text-plum py-2"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs text-gray-500">Logged in as {user.full_name}</p>
              <button
                onClick={handleDashboardRedirect}
                className="block w-full text-left font-bold text-plum py-2"
              >
                Go to {role === 'customer' ? 'Customer Portal' : 'Workspace'}
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left font-medium text-red-600 py-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-plum hover:bg-plum-dark text-white font-medium py-2 rounded"
              >
                Login / Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
