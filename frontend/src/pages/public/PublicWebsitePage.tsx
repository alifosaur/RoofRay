import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faBolt,
  faBatteryFull,
  faCheckCircle,
  faArrowRight,
  faShieldAlt,
  faLeaf,
  faPhoneAlt,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';

export const PublicWebsitePage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [capacityKw, setCapacityKw] = useState(3.0);
  const [systemType, setSystemType] = useState('ON_GRID');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      setSubmitting(true);
      const lead = await api.post('/leads/public', {
        name,
        phone,
        email: email || undefined,
        address,
        required_capacity_kw: Number(capacityKw),
        system_type: systemType,
        notes: notes || undefined,
      });
      setSubmittedLead(lead);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit quote request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const PACKAGES = [
    {
      kw: 1,
      title: '1 kW Compact Solar',
      onGridPrice: 55000,
      offGridPrice: 85000,
      panels: '2-3 High-efficiency Mono PERC Panels',
      generation: '120 - 140 Units / month',
      idealFor: '1-2 BHK apartments, small clinics, basic home appliances',
    },
    {
      kw: 2,
      title: '2 kW Smart Solar',
      onGridPrice: 105000,
      offGridPrice: 155000,
      panels: '4-5 Half-cut Mono Panels',
      generation: '240 - 280 Units / month',
      idealFor: '2-3 BHK homes, refrigerator, lighting, 1 AC in day',
    },
    {
      kw: 3,
      title: '3 kW Popular Residential',
      onGridPrice: 150000,
      offGridPrice: 225000,
      panels: '6-7 Bi-facial Mono Panels',
      generation: '360 - 420 Units / month',
      idealFor: '3-4 BHK homes, multiple ACs, zero electricity bill target',
      recommended: true,
    },
    {
      kw: 4,
      title: '4 kW Executive Solar',
      onGridPrice: 195000,
      offGridPrice: 285000,
      panels: '8-9 TopCon High Output Panels',
      generation: '480 - 560 Units / month',
      idealFor: 'Large villas, home offices, EV charging support',
    },
    {
      kw: 5,
      title: '5 kW Commercial Pro',
      onGridPrice: 240000,
      offGridPrice: 345000,
      panels: '10-12 Industrial Tier-1 Panels',
      generation: '600 - 700 Units / month',
      idealFor: 'Commercial shops, schools, hospitals, farm houses',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-odoo-primary flex items-center justify-center text-white text-xl shadow-md">
              <FontAwesomeIcon icon={faSun} className="text-amber-400" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">SunPower Solutions</span>
              <span className="block text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                Rooftop Solar & Micro-Grid Systems
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="#packages"
              className="text-xs font-semibold text-gray-600 hover:text-odoo-primary hidden sm:block"
            >
              Solar Packages
            </a>
            <a
              href="#quote-form"
              className="text-xs font-semibold text-gray-600 hover:text-odoo-primary hidden sm:block"
            >
              Instant Quote
            </a>
            <button
              onClick={() => navigate('/web/crm')}
              className="bg-odoo-primary hover:bg-odoo-primary-dark text-white px-4 py-2 rounded text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FontAwesomeIcon icon={faUserShield} />
              <span>Staff Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-950 via-slate-900 to-teal-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium text-amber-300">
            <FontAwesomeIcon icon={faLeaf} />
            <span>Government Subsidy Available • Save up to 85% on Electricity</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Switch Your Rooftop to Clean Solar Power
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-300 leading-relaxed">
            Turn your unused roof space into an energy asset. SunPower Solutions delivers end-to-end site survey, Tier-1 hardware, seamless installation, and guaranteed 25-year panel warranty.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <a
              href="#quote-form"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-lg text-sm shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
            >
              <span>Get Free Site Survey & Quote</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </a>
            <a
              href="#packages"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg text-sm border border-white/20 backdrop-blur transition-colors"
            >
              Explore Packages (1–5 kW)
            </a>
          </div>

          {/* Key Selling Badges */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-xs text-left">
            <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-lg border border-white/10">
              <FontAwesomeIcon icon={faShieldAlt} className="text-amber-400 text-base" />
              <span>20-Year Panel Warranty</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-lg border border-white/10">
              <FontAwesomeIcon icon={faBolt} className="text-teal-400 text-base" />
              <span>Tier-1 Smart Inverters</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-lg border border-white/10">
              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-base" />
              <span>Net-Metering Ready</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/5 p-3 rounded-lg border border-white/10">
              <FontAwesomeIcon icon={faBatteryFull} className="text-blue-400 text-base" />
              <span>Off-Grid Battery Options</span>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs uppercase font-bold text-odoo-primary tracking-wider">
            Standardised Packages
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Rooftop Solar Capacities (1 kW to 5 kW)
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
            Choose between On-Grid (grid-tied net metering) or Off-Grid (with high-capacity battery bank for 24/7 power backup).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.kw}
              className={`bg-white rounded-xl border flex flex-col justify-between p-4 shadow-xs transition-all hover:shadow-md ${
                pkg.recommended
                  ? 'border-odoo-primary ring-2 ring-odoo-primary/20'
                  : 'border-gray-200'
              }`}
            >
              <div>
                {pkg.recommended && (
                  <span className="bg-odoo-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-2">
                    Most Popular
                  </span>
                )}
                <h3 className="font-bold text-sm text-gray-900">{pkg.title}</h3>
                <div className="mt-3">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">On-Grid System</div>
                  <div className="text-lg font-bold text-odoo-primary">₹{pkg.onGridPrice.toLocaleString()}</div>
                </div>
                <div className="mt-1">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Off-Grid (with Battery)</div>
                  <div className="text-sm font-bold text-gray-700">₹{pkg.offGridPrice.toLocaleString()}</div>
                </div>

                <div className="border-t border-gray-100 my-3 pt-3 space-y-2 text-[11px] text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-800">Panels:</span> {pkg.panels}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Generation:</span> {pkg.generation}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Best for:</span> {pkg.idealFor}
                  </div>
                </div>
              </div>

              <a
                href="#quote-form"
                onClick={() => {
                  setCapacityKw(pkg.kw);
                }}
                className={`mt-4 w-full py-1.5 rounded text-xs font-bold text-center block transition-colors ${
                  pkg.recommended
                    ? 'bg-odoo-primary hover:bg-odoo-primary-dark text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                Select {pkg.kw} kW
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Lead Capture Form Section */}
      <section id="quote-form" className="bg-gray-100 py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-odoo-primary text-white p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold">Request a Free Rooftop Assessment & Quote</h2>
            <p className="text-xs sm:text-sm text-purple-200 mt-1">
              Our certified solar engineer will conduct a shadow-free roof survey and calculate your exact electricity bill savings.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {submittedLead ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-4xl" />
                <h3 className="text-lg font-bold text-emerald-800">Thank You! Request Received</h3>
                <p className="text-xs text-gray-700">
                  Your enquiry reference number is{' '}
                  <span className="font-mono font-bold text-odoo-primary">{submittedLead.lead_number}</span>.
                  A dedicated solar consultant has been auto-assigned and will call you shortly.
                </p>
                <button
                  onClick={() => setSubmittedLead(null)}
                  className="mt-2 text-xs text-odoo-primary font-bold hover:underline"
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4 text-xs">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      System Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={systemType}
                      onChange={(e) => setSystemType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                    >
                      <option value="ON_GRID">On-Grid (Connected to Power Board / Net-meter)</option>
                      <option value="OFF_GRID">Off-Grid (Independent with Battery Bank)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Required System Capacity (kW) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={capacityKw}
                      onChange={(e) => setCapacityKw(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                    >
                      <option value={1}>1 kW (Basic Home)</option>
                      <option value={2}>2 kW (Standard Home)</option>
                      <option value={3}>3 kW (Family Home - Recommended)</option>
                      <option value={4}>4 kW (Large Residence)</option>
                      <option value={5}>5 kW (Commercial / Villa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                      Site Rooftop Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="House #, Street, City, Pincode"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Roof Details & Monthly Electricity Bill
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Monthly bill ~₹4,500, concrete flat terrace with RCC water tank."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-odoo-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-odoo-primary hover:bg-odoo-primary-dark text-white font-bold py-3 rounded-lg text-sm shadow-md transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Request Free Rooftop Assessment'}
                </button>

                <p className="text-[10px] text-gray-400 text-center">
                  Protected by SunPower Privacy Policy. Rate limited lead submission.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>© 2026 SunPower Solutions. Rooftop Solar Installation & Maintenance Systems.</p>
          <p className="text-[11px] text-gray-500">
            Certified Solar EPC Provider • 40+ Projects/Month • 15 Field Engineers
          </p>
        </div>
      </footer>
    </div>
  );
};
