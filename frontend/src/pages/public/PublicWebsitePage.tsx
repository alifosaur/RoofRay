import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { SquiggleLink } from '../../components/common/SquiggleLink';
import { SplitSection } from '../../components/common/SplitSection';
import { FeatureBand, FeatureItem } from '../../components/common/FeatureBand';
import { InfoList, InfoBulletItem } from '../../components/common/InfoList';
import { RooftopSolarIllustration } from '../../components/brand/RooftopSolarIllustration';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faSun,
  faCheckCircle,
  faArrowRight,
  faShieldAlt,
  faTag,
  faCalculator,
} from '@fortawesome/free-solid-svg-icons';

export const PublicWebsitePage: React.FC = () => {
  const navigate = useNavigate();

  // Consultation Call Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [capacityKw, setCapacityKw] = useState(3.0);
  const [systemType, setSystemType] = useState('On-Grid');
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
        required_capacity: Number(capacityKw),
        system_type: systemType,
        source: 'book_a_call',
        notes: notes ? `Booked Call: ${notes}` : 'Client Booked Consultation Call to Get Quotation',
      });
      setSubmittedLead(lead);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to book consultation call. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const featureItems: FeatureItem[] = [
    {
      title: 'Lower electricity bills',
      description:
        'Generate your own clean solar energy and cut grid power bills by up to 90% from day one with net-metering export.',
    },
    {
      title: 'Government subsidy support',
      description:
        'Direct Benefit Transfer (DBT) of up to ₹78,000 under PM Surya Ghar Muft Bijli Yojana with zero paperwork hassle.',
    },
    {
      title: 'Certified quality kit',
      description:
        'Tier-1 monocrystalline PERC panels, IP65 smart on-grid inverters, and heavy-duty pre-galvanized structures.',
    },
    {
      title: 'Expert survey and installation',
      description:
        'Comprehensive shadow analysis by our 15 in-house trained technicians, with turnkey DISCOM net-metering synchronization.',
    },
    {
      title: 'Serial-tracked warranty',
      description:
        'Every inverter, battery, and panel is registered by barcode in your portal for genuine 20-to-25-year warranty protection.',
    },
    {
      title: 'Live order tracking',
      description:
        'Real-time 13-stage visibility from initial enquiry and engineering feasibility to warehouse dispatch and commissioning.',
    },
  ];

  const infoBullets: InfoBulletItem[] = [
    {
      leadIn: 'Enquire',
      text: 'Book a consultation call and submit your roof area and electricity bill in under 2 minutes.',
    },
    {
      leadIn: 'Survey',
      text: 'Certified technician visits your roof to measure tilt, orientation, and shadow-free zones.',
    },
    {
      leadIn: 'Consultation & Quotation',
      text: 'Our technical advisor calls you, evaluates requirements, and prepares a customized quotation according to your roof.',
    },
    {
      leadIn: 'Delivery',
      text: 'Tier-1 panels and smart inverters barcode-scanned and reserved from our warehouse stock.',
    },
    {
      leadIn: 'Installation',
      text: 'Our in-house 15-technician crew completes mounting, wiring, earthing, and on-site generation testing.',
    },
    {
      leadIn: 'Subsidy',
      text: 'Direct Benefit Transfer (DBT) subsidy of up to ₹78,000 processed directly into your bank account.',
    },
  ];

  const PREVIEW_PACKAGES = [
    {
      kw: 2,
      name: '2 kW Smart On-Grid',
      tag: 'Best for 2-3 BHK',
      price: '₹ 1,15,000',
      subsidy: '₹ 60,000',
      netCost: '₹ 55,000',
      generation: '240 - 280 Units/mo',
      panels: '4-5 Mono PERC Panels',
    },
    {
      kw: 3,
      name: '3 kW Popular Residential',
      tag: 'Most Popular',
      price: '₹ 1,65,000',
      subsidy: '₹ 78,000 (Max)',
      netCost: '₹ 87,000',
      generation: '360 - 420 Units/mo',
      panels: '6-7 Bi-facial Half-Cut Panels',
      popular: true,
    },
    {
      kw: 5,
      name: '5 kW High-Capacity Villa',
      tag: 'Commercial & Villas',
      price: '₹ 2,75,000',
      subsidy: '₹ 78,000',
      netCost: '₹ 1,97,000',
      generation: '600 - 700 Units/mo',
      panels: '10-12 TopCon Panels',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      {/* 1. Header & Navigation */}
      <SiteNavbar />

      <main className="flex-1">
        {/* 2. Hero SplitSection matching Screenshot 1 */}
        <SplitSection
          id="hero"
          className="pt-10 sm:pt-14 pb-20 sm:pb-24"
          left={
            <div className="flex flex-col">
              <ScriptHeading as="h1" underline className="mb-8">
                About RoofRay
              </ScriptHeading>

              <div className="space-y-6 body-paragraph">
                <p>
                  RoofRay Solutions is an end-to-end rooftop solar engineering and installation company powering over 40 homes and commercial rooftops every single month. We specialize in residential bungalows, housing societies, and small-factory rooftops, turning unused terrace space into high-yield clean power plants.
                </p>

                <p>
                  Our journey began with a simple commitment: transparent rooftop engineering, zero-compromise hardware, and lifelong after-sales support. Every project is configured with tier-1 monocrystalline panels backed by an authentic 20-to-25-year performance warranty, IP65 smart on-grid inverters, and heavy-duty pre-galvanized mounting structures engineered to withstand high wind zones.
                </p>

                <p>
                  Today, RoofRay handles the entire journey from structural shadow analysis to DISCOM net-metering synchronization and direct-to-bank{' '}
                  <SquiggleLink to="/schemes">government subsidy</SquiggleLink>{' '}
                  paperwork, delivering uninterrupted clean energy with complete peace of mind.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-10">
                <a
                  href="#book-call"
                  className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-[15px] font-medium px-7 py-3 rounded text-center transition-colors shadow-xs"
                >
                  Book a Call to Get Quotation
                </a>
                <Link
                  to="/packages"
                  className="border border-[#6B4B63] text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white text-[15px] font-medium px-7 py-3 rounded text-center transition-colors"
                >
                  Browse Solar Packages
                </Link>
              </div>
            </div>
          }
          right={<RooftopSolarIllustration />}
        />

        {/* 3. FeatureBand matching Screenshot 2 */}
        <FeatureBand
          id="features"
          title="Why go solar with RoofRay?"
          items={featureItems}
        />

        {/* 4. Packages Preview Cards */}
        <section id="packages" className="py-20 sm:py-24 bg-white border-b border-gray-100">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Standard Packages
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Rooftop Solar Systems
                </ScriptHeading>
              </div>
              <p className="mt-4 text-[#6C757D] text-base leading-relaxed">
                Pre-engineered Bill of Materials with tier-1 panels, smart inverters, and full DISCOM net-metering approval.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PREVIEW_PACKAGES.map((pkg, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all duration-200 p-7 flex flex-col justify-between ${
                    pkg.popular
                      ? 'border-[#6B4B63] shadow-md relative bg-gradient-to-b from-white to-[#F8F4F7]/40 ring-2 ring-[#6B4B63]/20'
                      : 'border-gray-200 shadow-xs hover:border-gray-300 bg-white'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3.5 right-6 bg-[#6B4B63] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-[#495057] mb-3">
                      {pkg.tag}
                    </span>
                    <h3 className="text-xl font-bold text-[#212529] mb-1">{pkg.name}</h3>
                    <p className="text-sm text-[#6C757D] mb-6">{pkg.panels}</p>

                    <div className="border-t border-b border-gray-100 py-4 my-4 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Gross Price:</span>
                        <span className="font-semibold text-gray-800 line-through">{pkg.price}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#5CC9B0] font-medium">PM Surya Ghar Subsidy:</span>
                        <span className="font-bold text-[#5CC9B0]">-{pkg.subsidy}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                        <span className="text-base font-bold text-[#212529]">Net Investment:</span>
                        <span className="text-2xl font-extrabold text-[#6B4B63]">{pkg.netCost}</span>
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-sm text-[#495057] mb-8">
                      <li className="flex items-center">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#5CC9B0] mr-2 text-xs" />
                        <span>Generates {pkg.generation}</span>
                      </li>
                      <li className="flex items-center">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#5CC9B0] mr-2 text-xs" />
                        <span>25-year panel performance guarantee</span>
                      </li>
                      <li className="flex items-center">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#5CC9B0] mr-2 text-xs" />
                        <span>Turnkey net-metering & DISCOM approvals</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/packages"
                    className={`w-full py-2.5 rounded font-medium text-sm text-center transition-colors ${
                      pkg.popular
                        ? 'bg-[#6B4B63] hover:bg-[#583D51] text-white shadow-xs'
                        : 'border border-[#6B4B63] text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white'
                    }`}
                  >
                    View BOM & Details
                  </Link>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/packages"
                className="inline-flex items-center space-x-2 text-[#6B4B63] hover:text-[#583D51] font-bold text-base hover:underline"
              >
                <span>Browse all 1 kW to 5 kW On-Grid & Off-Grid Packages</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
              </Link>
            </div>
          </div>
        </section>

        {/* 5. InfoList matching Screenshot 3 */}
        <InfoList
          id="how-it-works"
          title="How it works:"
          items={infoBullets}
          secondaryTitle="What if you switch?"
          secondaryParagraphs={[
            'Switching to solar with RoofRay is designed to be frictionless. Our engineers take full responsibility for roof structural safety, shadow-free positioning, and liaison with your local DISCOM electricity board.',
            'From the day your bi-directional meter is energized, you stop paying commercial and residential peak tariffs. Every kilowatt-hour generated is tracked through your live customer portal.',
          ]}
          sideIllustrationCaption="Power from your own roof!"
        />

        {/* 6. Embedded Book a Call Form Section matching Design System */}
        <section id="book-call" className="py-20 sm:py-24 bg-[#F8F4F7]/40 border-t border-gray-100">
          <div id="quote-section" className="-mt-20 pt-20"></div>
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-subtle border border-gray-200 p-8 sm:p-10">
              <div className="text-center mb-8">
                <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                  Free Rooftop Consultation
                </span>
                <div className="mt-1 flex justify-center">
                  <ScriptHeading as="h2" align="center">
                    Book a Call to Get the Quotation
                  </ScriptHeading>
                </div>
                <p className="mt-3 text-sm text-[#6C757D]">
                  Schedule a free consultation call with our solar engineers. We will call you, assess your roof capacity, and prepare a customized quotation according to your roof.
                </p>
              </div>

              {submittedLead ? (
                <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg text-center animate-in fade-in">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-[#5CC9B0] mb-3" />
                  <h4 className="text-lg font-bold text-[#212529]">Thank you, {submittedLead.name}!</h4>
                  <p className="text-sm text-[#495057] mt-2">
                    Your consultation call has been booked. Our sales representative will call you soon at{' '}
                    <strong>{submittedLead.phone}</strong> to discuss your requirements and prepare your customized quotation.
                  </p>
                  <button
                    onClick={() => setSubmittedLead(null)}
                    className="mt-5 text-sm text-[#6B4B63] hover:underline font-bold"
                  >
                    Book another consultation call
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-5">
                  {errorMessage && (
                    <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                      {errorMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98110 00000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="ramesh@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        System Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={systemType}
                        onChange={(e) => setSystemType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                      >
                        <option value="On-Grid">On-Grid (Connected to Grid, Net-metering)</option>
                        <option value="Off-Grid">Off-Grid (with Battery Energy Storage Bank)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      Rooftop Address & City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="House No., Street, Sector, City, State"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-[#212529]">
                        Target Capacity: <span className="text-[#6B4B63] font-bold">{capacityKw} kW</span>
                      </label>
                      <span className="text-xs text-gray-400">1 to 5 kW</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={capacityKw}
                      onChange={(e) => setCapacityKw(parseFloat(e.target.value))}
                      className="w-full accent-[#6B4B63] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      Additional Notes / Monthly Bill
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. RCC flat terrace, approx monthly electricity bill ₹4,500..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded text-sm text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-3 rounded text-sm transition-colors shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Booking Call...' : 'Book a Call to Get Quotation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer matching Screenshot 3 */}
      <SiteFooter />
    </div>
  );
};
