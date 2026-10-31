import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleHomePath } from '../../context/AuthContext';
import { SunPowerLogo } from './SunPowerLogo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faBars,
  faTimes,
  faUser,
  faTachometerAlt,
  faSignOutAlt,
  faPalette,
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

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Packages', path: '/packages' },
    { label: 'Govt Schemes', path: '/schemes' },
    { label: 'Help', path: '/help' },
    { label: 'My Account', path: user ? (role === 'customer' ? '/customer' : getRoleHomePath(role)) : '/login' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userDisplayName = user
    ? user.full_name
      ? user.full_name.split(' ')[0] + (user.full_name.split(' ')[1] ? `.${user.full_name.split(' ')[1][0]}` : '')
      : user.email.split('@')[0]
    : '';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] h-16 transition-all">
      <div className="max-w-site mx-auto px-6 h-full flex items-center justify-between">
        
        {/* Left: Logo & Nav Links */}
        <div className="flex items-center space-x-8 md:space-x-10">
          <SunPowerLogo size="md" />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-7 text-[15px]">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`transition-colors duration-150 py-1 ${
                    active
                      ? 'text-heading-dark font-medium border-b-2 border-heading-dark'
                      : 'text-body-grey font-normal hover:text-plum'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User / Auth Controls */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 text-[15px] text-heading-dark font-medium hover:text-plum py-2 px-3 rounded hover:bg-gray-50 transition-colors"
                aria-expanded={dropdownOpen}
              >
                <span>{userDisplayName || user.full_name || 'My Account'}</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-xs text-body-grey transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-2 border border-gray-100 z-50 text-[14px]">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-heading-dark truncate">{user.full_name}</p>
                    <p className="text-xs text-body-grey capitalize">{user.role} workspace</p>
                  </div>

                  <Link
                    to={getRoleHomePath(role)}
                    className="flex items-center px-4 py-2 text-heading-dark hover:bg-gray-50 hover:text-plum transition-colors"
                  >
                    <FontAwesomeIcon icon={faTachometerAlt} className="w-4 mr-2.5 text-body-grey" />
                    My Dashboard
                  </Link>

                  <Link
                    to="/customer"
                    className="flex items-center px-4 py-2 text-heading-dark hover:bg-gray-50 hover:text-plum transition-colors"
                  >
                    <FontAwesomeIcon icon={faUser} className="w-4 mr-2.5 text-body-grey" />
                    Customer Portal
                  </Link>

                  <Link
                    to="/styleguide"
                    className="flex items-center px-4 py-2 text-heading-dark hover:bg-gray-50 hover:text-plum transition-colors"
                  >
                    <FontAwesomeIcon icon={faPalette} className="w-4 mr-2.5 text-body-grey" />
                    Styleguide
                  </Link>

                  <div className="border-t border-gray-100 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-4 mr-2.5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-[15px] text-body-grey hover:text-plum font-normal transition-colors px-2 py-1"
              >
                Login / Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-heading-dark hover:text-plum focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-3 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className={`block py-2 text-base ${
                isActive(link.path)
                  ? 'text-heading-dark font-semibold'
                  : 'text-body-grey font-normal hover:text-plum'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-gray-100">
            {user ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-heading-dark">{user.full_name}</div>
                <Link
                  to={getRoleHomePath(role)}
                  className="block text-sm text-plum hover:underline"
                >
                  Go to {role} dashboard &rarr;
                </Link>
                <button
                  onClick={handleLogout}
                  className="block text-sm text-red-600 hover:underline pt-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-block w-full text-center py-2 px-4 rounded bg-plum text-white font-medium hover:bg-plum-dark"
              >
                Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
