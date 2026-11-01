import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { SquiggleLink } from '../../components/common/SquiggleLink';
import { FeatureBand, FeatureItem } from '../../components/common/FeatureBand';
import { RooftopSolarIllustration } from '../../components/brand/RooftopSolarIllustration';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faSun,
  faCheckCircle,
  faArrowRight,
  faShieldAlt,
  faCalculator,
  faLeaf,
  faAward,
  faStar,
  faSolarPanel,
  faHandHoldingUsd,
  faCalendarCheck,
  faClock,
  faQuestionCircle,
  faChevronDown,
  faChevronUp,
  faHome,
  faTools,
} from '@fortawesome/free-solid-svg-icons';

export const PublicWebsitePage: React.FC = () => {
  const navigate = useNavigate();

  // Solar Savings & Rooftop ROI Calculator state
  const [monthlyBill, setMonthlyBill] = useState<number>(5500);
  const [roofType, setRoofType] = useState<'rcc' | 'metal' | 'shed'>('rcc');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Realistic dynamic solar engineering calculations based on benchmark standards
  const calcCapacityKw = Math.min(10, Math.max(1, Math.round((monthlyBill / 950) * 2) / 2));
  const estimatedUnits = Math.round(calcCapacityKw * 125);
  const estimatedSavingsMonthly = Math.min(monthlyBill, Math.round(estimatedUnits * 7.8));
  const estimatedNewBill = Math.max(250, monthlyBill - estimatedSavingsMonthly);

  // Subsidy comes from the admin-managed schemes table via the estimator API
  const [subsidyAmount, setSubsidyAmount] = useState<number>(0);
  useEffect(() => {
    api
      .post<any>('/customer/schemes/estimate', { capacity_kw: Math.min(calcCapacityKw, 50), system_type: 'On-Grid' })
      .then((res) => setSubsidyAmount(res.central_subsidy + res.state_subsidy))
      .catch(() => setSubsidyAmount(0));
  }, [calcCapacityKw]);

  const lifetime25YrSavings = Math.round((estimatedSavingsMonthly * 12 * 25) / 100000 * 10) / 10;
  const treesPlantedEquivalent = Math.round(calcCapacityKw * 16);

  const featureItems: FeatureItem[] = [
    {
      title: 'Lower electricity bills',
      description:
        'Generate your own clean solar energy and cut grid power bills by up to 90% from day one with net-metering export.',
    },
    {
      title: 'Government subsidy support',
      description:
        'We handle your PM Surya Ghar: Muft Bijli Yojana subsidy application end to end. Up to ₹78,000 credited direct to your bank.',
    },
    {
      title: 'Certified quality kit',
      description:
        'Tier-1 monocrystalline PERC panels, IP65 smart on-grid inverters, and heavy-duty pre-galvanized structures.',
    },
    {
      title: 'Expert survey and installation',
      description:
        'Comprehensive shadow analysis by our certified in-house technicians, with turnkey DISCOM net-metering synchronization.',
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

  const popularPackages = [
    {
      id: 1,
      name: '2 kW Starter On-Grid',
      capacityKw: 2,
      idealFor: '1-2 BHK Apartments & Small Homes',
      monthlyUnits: '~250 units/mo',
      grossPrice: 130000,
      subsidy: 60000,
      netPrice: 70000,
      monthlySavings: '₹2,100',
      popular: false,
      highlights: ['4 × 540W Mono PERC Panels', '2 kW IP65 Smart Inverter', 'DISCOM Net-Meter Liaison'],
    },
    {
      id: 2,
      name: '3 kW Family Essential',
      capacityKw: 3,
      idealFor: '3-4 BHK Homes with 1-2 Air Conditioners',
      monthlyUnits: '~375 units/mo',
      grossPrice: 185000,
      subsidy: 78000,
      netPrice: 107000,
      monthlySavings: '₹3,400',
      popular: true,
      highlights: ['6 × 540W Mono PERC Panels', '3.3 kW Smart Grid-Tie Inverter', 'Max ₹78,000 Govt Subsidy'],
    },
    {
      id: 3,
      name: '5 kW Villa & Commercial',
      capacityKw: 5,
      idealFor: 'Large Independent Bungalows & Clinics',
      monthlyUnits: '~625 units/mo',
      grossPrice: 295000,
      subsidy: 78000,
      netPrice: 217000,
      monthlySavings: '₹5,800',
      popular: false,
      highlights: ['10 × 540W Mono PERC Panels', '5 kW Three-Phase Smart Inverter', 'Heavy Duty Wind-Rated Mounts'],
    },
  ];

  const journeySteps = [
    {
      step: '01',
      title: 'Instant Inquiry & Feasibility',
      description: 'Submit your rooftop area and average power bill online. Get instant capacity recommendation in seconds.',
      icon: faCalculator,
      color: 'bg-purple-100 text-[#6B4B63]',
    },
    {
      step: '02',
      title: '3D Shadow & Structural Survey',
      description: 'Certified technician visits your roof with laser tools to inspect structural load, tilt, and shadow-free zones.',
      icon: faTools,
      color: 'bg-teal-100 text-teal-800',
    },
    {
      step: '03',
      title: 'Tailored Quote & DISCOM Filing',
      description: 'Receive an itemized engineering quote with exact BOM components and DISCOM net-metering feasibility filing.',
      icon: faSun,
      color: 'bg-amber-100 text-amber-800',
    },
    {
      step: '04',
      title: 'Barcode-Scanned Installation',
      description: 'Hardware is verified by serial number from central inventory. Technicians mount, wire, and earth the system.',
      icon: faCheckCircle,
      color: 'bg-emerald-100 text-emerald-800',
    },
    {
      step: '05',
      title: 'Net Metering & Subsidy Credit',
      description: 'DISCOM energizes the bi-directional meter. Your ₹78,000 PM Surya Ghar subsidy is credited directly to your bank account.',
      icon: faHandHoldingUsd,
      color: 'bg-indigo-100 text-indigo-800',
    },
  ];

  const testimonials = [
    {
      quote: 'Our monthly power bill reduced from ₹6,800 to ₹350! The central subsidy of ₹78,000 was credited directly to our SBI bank account in less than 30 days. The portal tracking made the whole experience effortless.',
      author: 'Rajesh & Meena Sharma',
      location: 'Hyderabad, Telangana',
      system: '3 kW On-Grid Rooftop',
      savings: 'Saved ₹75,000+ in Year 1',
    },
    {
      quote: 'Installed a 5 kW setup on our bungalow. RoofRay handled all the BESCOM electricity board paperwork without us having to step out once. Build quality of the galvanized mounting structure is top notch.',
      author: 'Col. Anand Verma (Retd.)',
      location: 'Bengaluru, Karnataka',
      system: '5 kW Three-Phase System',
      savings: '95% Grid Tariffs Eliminated',
    },
    {
      quote: 'The 25-year tier-1 warranty and serial-tracked components gave us complete confidence. The live mobile updates kept us informed at every single step from survey to grid synchronization.',
      author: 'Dr. Sunita Kulkarni',
      location: 'Pune, Maharashtra',
      system: '3 kW Residential Rooftop',
      savings: '₹3,200/mo Consistent Savings',
    },
  ];

  const faqs = [
    {
      q: 'How does DISCOM net-metering work?',
      a: 'A bi-directional meter replaces your standard electricity meter. When your solar panels produce more electricity than your home consumes during daytime, the surplus power flows into the DISCOM grid. You earn billing credits that offset power drawn at night, bringing your net bill down to zero or minimum fixed charges.',
    },
    {
      q: 'How and when is the PM Surya Ghar ₹78,000 subsidy credited?',
      a: 'Under the PM Surya Ghar: Muft Bijli Yojana, residential consumers receive direct bank transfer (DBT) subsidies: ₹30,000 for 1 kW, ₹60,000 for 2 kW, and ₹78,000 for systems 3 kW and above. RoofRay submits your technical survey and commissioning report to the national portal, and the funds are credited directly to your bank account by the government.',
    },
    {
      q: 'How much rooftop area is required for a solar installation?',
      a: 'As a rule of thumb, approximately 80 to 100 square feet of shadow-free rooftop space is required per kilowatt (kW). For example, a 3 kW system requires ~250–300 sq. ft. of space. Our certified technicians verify roof orientation and structural integrity during the free site survey.',
    },
    {
      q: 'What happens during cloudy days or monsoons?',
      a: 'Solar photovoltaic panels generate electricity from ambient daylight (diffuse radiation), not direct heat. While generation is approximately 30-50% on heavily overcast rainy days, your system remains synchronized with the electricity grid, so you always enjoy uninterrupted power supply.',
    },
    {
      q: 'What warranties and after-sales support does RoofRay provide?',
      a: 'Every system comes with a 25-year linear performance warranty on Tier-1 monocrystalline panels, a 5-to-10-year replacement warranty on smart inverters, and comprehensive 5-year workmanship support. Every component is serial-number verified in your customer portal.',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      {/* 1. Header & Navigation */}
      <SiteNavbar />

      <main className="flex-1">
        {/* 2. Hero Section (Enhanced, Dynamic & Balanced) */}
        <section id="hero" className="relative pt-8 sm:pt-12 pb-16 sm:pb-20 overflow-hidden bg-gradient-to-b from-purple-50/40 via-white to-white">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* Left Column: Heading & Value Proposition */}
              <div className="lg:col-span-7 flex flex-col">
                {/* Trust Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-[#6B4B63] text-xs font-semibold mb-4 w-fit shadow-2xs">
                  <FontAwesomeIcon icon={faSun} className="text-amber-500" />
                  <span>India's Premier Rooftop Solar Engineering Platform</span>
                  <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                  <span className="text-[#017E84] font-bold">PM Surya Ghar Approved</span>
                </div>

                <ScriptHeading as="h1" underline className="mb-4">
                  About RoofRay
                </ScriptHeading>

                <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6 font-normal">
                  RoofRay is an end-to-end rooftop solar engineering company powering over <strong>40 residential bungalows, housing societies, and commercial rooftops</strong> every month. We transform unused terraces into high-yield, clean power plants with <strong>guaranteed 25-year performance</strong> and <strong>up to ₹78,000 direct-to-bank government subsidies</strong>.
                </p>

                {/* 4 Feature Value Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-50/70 border border-purple-100/80 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#6B4B63] text-white flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faBolt} className="text-sm" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block text-xs">Cut Bills by Up to 90%</span>
                      <span className="text-gray-600 text-[11px] leading-tight">Turnkey DISCOM bi-directional net-metering</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50/70 border border-teal-100/80 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#5CC9B0] text-teal-950 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faHandHoldingUsd} className="text-sm" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block text-xs">₹78,000 Direct Subsidy</span>
                      <span className="text-gray-600 text-[11px] leading-tight">PM Surya Ghar DBT credited directly to your bank</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-100/80 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faShieldAlt} className="text-sm" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block text-xs">25-Yr Linear Warranty</span>
                      <span className="text-gray-600 text-[11px] leading-tight">Tier-1 monocrystalline panels & IP65 inverters</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/80 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faClock} className="text-sm" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block text-xs">13-Stage Live Tracking</span>
                      <span className="text-gray-600 text-[11px] leading-tight">Real-time status updates in customer portal</span>
                    </div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <Link
                    to="/packages"
                    className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-[15px] font-semibold px-6 py-3 rounded-xl text-center transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faSolarPanel} />
                    <span>Explore Solar Packages</span>
                  </Link>

                  <Link
                    to="/schemes"
                    className="bg-white border border-[#6B4B63] text-[#6B4B63] hover:bg-purple-50 text-[15px] font-semibold px-6 py-3 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faAward} />
                    <span>Government Subsidy Guide</span>
                  </Link>

                  <a
                    href="#calculator"
                    className="text-xs font-semibold text-[#6B4B63] hover:text-[#583D51] text-center py-2 px-3 rounded-lg hover:bg-purple-50/60 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FontAwesomeIcon icon={faCalculator} />
                    <span>Calculate ROI ↓</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Rooftop Illustration with Floating Dynamic Stats */}
              <div className="lg:col-span-5 flex justify-center items-center">
                <div className="relative w-full max-w-lg mx-auto">
                  <RooftopSolarIllustration className="w-full shadow-md rounded-2xl" />

                  {/* Floating Peak Generation Card */}
                  <div className="absolute -top-3 right-2 sm:-right-2 bg-white/95 backdrop-blur-md border border-emerald-200 rounded-xl px-3.5 py-2.5 shadow-md flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block leading-none">Peak Generation</span>
                      <span className="text-xs font-extrabold text-emerald-700 leading-tight">4.8 kW Peak • On-Grid</span>
                    </div>
                  </div>

                  {/* Floating Monthly Savings Card */}
                  <div className="absolute -bottom-3 left-2 sm:-left-2 bg-white/95 backdrop-blur-md border border-purple-200 rounded-xl px-3.5 py-2.5 shadow-md flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#6B4B63] text-white flex items-center justify-center text-xs">
                      <FontAwesomeIcon icon={faBolt} />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block leading-none">Typical Savings</span>
                      <span className="text-xs font-extrabold text-[#6B4B63] leading-tight">₹4,500 – ₹8,200 / mo</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. Numbers & Proof Bar */}
        <section className="bg-gradient-to-r from-purple-50/70 via-white to-teal-50/70 border-y border-purple-100/80 py-7">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-gray-200/70">
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#6B4B63]">500+</span>
                <span className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">Installed Rooftops</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600">₹4.8 Cr+</span>
                <span className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">Electricity Bills Saved</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#212529]">25 Years</span>
                <span className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">Tier-1 Linear Warranty</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#017E84]">100%</span>
                <span className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">DISCOM Net-Meter Success</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FeatureBand: Why Go Solar With RoofRay */}
        <FeatureBand
          id="features"
          title="Why go solar with RoofRay?"
          items={featureItems}
        />

        {/* 5. Featured Pre-Engineered Solar Packages Preview */}
        <section id="packages-preview" className="py-20 sm:py-24 bg-slate-50/80 border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Pre-Engineered Systems
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Popular Solar Packages
                </ScriptHeading>
              </div>
              <p className="mt-4 text-gray-600 text-base leading-relaxed">
                Factory-tested kits with Tier-1 monocrystalline panels, smart inverters, DISCOM net-metering paperwork, and upfront PM Surya Ghar subsidy deductions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {popularPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between border transition-all duration-200 ${
                    pkg.popular
                      ? 'border-[#6B4B63] shadow-lg ring-2 ring-[#6B4B63]/15 relative'
                      : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#6B4B63] text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      ★ Most Popular Choice
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#017E84] block">
                          On-Grid Solar
                        </span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{pkg.name}</h3>
                      </div>
                      <span className="text-base font-extrabold px-2.5 py-1 bg-purple-50 text-[#6B4B63] rounded-lg border border-purple-200/60">
                        {pkg.capacityKw} kW
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 mb-4 leading-relaxed">{pkg.idealFor}</p>

                    {/* Pricing Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                      <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                        <span>Gross System Price:</span>
                        <span className="line-through">₹{pkg.grossPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold mb-2">
                        <span>Central Subsidy (DBT):</span>
                        <span>- ₹{pkg.subsidy.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                        <span className="text-xs font-bold text-gray-800">Effective Net Price:</span>
                        <span className="text-2xl font-extrabold text-[#6B4B63]">
                          ₹{pkg.netPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Spec Highlights */}
                    <div className="space-y-2.5 text-xs text-gray-700 mb-6">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <FontAwesomeIcon icon={faBolt} className="text-xs" />
                        <span>Est. Monthly Generation: {pkg.monthlyUnits}</span>
                      </div>
                      {pkg.highlights.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-xs shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    to="/packages"
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-center transition-all flex items-center justify-center gap-2 ${
                      pkg.popular
                        ? 'bg-[#6B4B63] hover:bg-[#583D51] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-[#6B4B63] text-gray-800 hover:text-white'
                    }`}
                  >
                    <span>View Package Details</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-[11px]" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/packages"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#6B4B63] hover:text-[#583D51] hover:underline"
              >
                <span>View all customized residential, society, and commercial packages</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Interactive Solar Savings & Rooftop ROI Estimator */}
        <section id="calculator" className="py-20 sm:py-24 bg-white border-b border-gray-100">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Rooftop Impact Estimator
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Calculate Your Rooftop Potential
                </ScriptHeading>
              </div>
              <p className="mt-4 text-[#6C757D] text-base leading-relaxed">
                Estimate how much you can save every month, your recommended solar capacity, and your eligibility for central PM Surya Ghar direct-benefit subsidies.
              </p>
            </div>

            {/* Interactive Calculator Panel */}
            <div className="max-w-4xl mx-auto bg-gradient-to-b from-white to-[#F8F4F7]/40 rounded-2xl border border-gray-200/90 shadow-md p-6 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Left Controls */}
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-[#212529]">
                        Current Monthly Electricity Bill:
                      </label>
                      <span className="text-xl font-extrabold text-[#6B4B63]">
                        ₹{monthlyBill.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1500"
                      max="25000"
                      step="500"
                      value={monthlyBill}
                      onChange={(e) => setMonthlyBill(Number(e.target.value))}
                      className="w-full accent-[#6B4B63] h-2 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1.5 font-medium">
                      {[1500, 10000, 25000].map((v) => (
                        <span key={v}>₹{v.toLocaleString('en-IN')}/mo</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] uppercase tracking-wider mb-2">
                      Rooftop Architecture:
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'rcc', label: 'RCC Terrace' },
                        { id: 'metal', label: 'Slanted Metal' },
                        { id: 'shed', label: 'Factory Shed' },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setRoofType(type.id as any)}
                          className={`py-2 px-2 rounded-lg font-semibold border transition-all text-center ${
                            roofType === type.id
                              ? 'bg-[#6B4B63] text-white border-[#6B4B63] shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 bg-teal-50/70 border border-[#5CC9B0]/40 rounded-xl flex items-start gap-3 text-xs text-[#212529]">
                    <FontAwesomeIcon icon={faLeaf} className="text-[#5CC9B0] text-lg mt-0.5" />
                    <div>
                      <strong className="block font-bold text-teal-900">Environmental Offset</strong>
                      <span>
                        This system avoids approx. <strong>{(calcCapacityKw * 1.4).toFixed(1)} tons</strong> of CO2 per year, equivalent to planting <strong>{treesPlantedEquivalent} trees</strong> annually.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Recommended System
                    </span>
                    <div className="text-xl font-extrabold text-[#212529] mt-1 flex items-baseline gap-1">
                      <span>{calcCapacityKw}</span>
                      <span className="text-sm font-semibold text-gray-500">kW</span>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      ~{Math.round(calcCapacityKw * 100)} sq. ft. roof area
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Central Subsidy (DBT)
                    </span>
                    <div className="text-xl font-extrabold text-[#017E84] mt-1">
                      ₹{subsidyAmount.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      PM Surya Ghar Scheme
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Estimated Monthly Bill
                    </span>
                    <div className="text-xl font-extrabold text-[#6B4B63] mt-1">
                      ₹{estimatedNewBill.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                      Save ₹{estimatedSavingsMonthly.toLocaleString()}/mo
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      25-Year Net Return
                    </span>
                    <div className="text-xl font-extrabold text-teal-800 mt-1">
                      ₹{lifetime25YrSavings}L
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Cumulative ROI
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button inside calculator */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500 text-center sm:text-left">
                  Estimated generation: <strong className="text-gray-800">~{estimatedUnits} kWh units</strong> per month based on seasonal peak sun hours.
                </div>
                <Link
                  to="/packages"
                  className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-colors shadow-xs flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faSolarPanel} />
                  <span>Browse Pre-Engineered Packages</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. The 5-Step Turnkey Solar Journey */}
        <section id="how-it-works" className="py-20 sm:py-24 bg-slate-50/60 border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Turnkey Workflow
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Your 5-Step Solar Journey
                </ScriptHeading>
              </div>
              <p className="mt-4 text-gray-600 text-base leading-relaxed">
                From your initial online request to bi-directional meter synchronization, RoofRay manages every technical, structural, and regulatory milestone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {journeySteps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between relative hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-gray-300 font-mono">{step.step}</span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${step.color}`}>
                        <FontAwesomeIcon icon={step.icon} className="text-sm" />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{step.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#017E84] text-xl shrink-0">
                  <FontAwesomeIcon icon={faShieldAlt} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Zero-Visit DISCOM Liaison Guarantee</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Our technical team handles all DISCOM approvals, net-meter inspection, and government subsidy filings on your behalf.
                  </p>
                </div>
              </div>
              <Link
                to="/customer"
                className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                Schedule Site Survey
              </Link>
            </div>
          </div>
        </section>

        {/* 8. Customer Testimonials & Verified Case Studies */}
        <section id="testimonials" className="py-20 sm:py-24 bg-white border-b border-gray-100">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Customer Stories
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Trusted by 500+ Rooftops
                </ScriptHeading>
              </div>
              <p className="mt-4 text-gray-600 text-base leading-relaxed">
                Hear directly from homeowners and commercial facilities who slashed their electricity bills with RoofRay.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/70 rounded-2xl p-6 sm:p-8 border border-gray-200 flex flex-col justify-between"
                >
                  <div>
                    {/* 5-Star Rating */}
                    <div className="flex items-center gap-1 text-amber-400 text-xs mb-4">
                      {[...Array(5)].map((_, i) => (
                        <FontAwesomeIcon key={i} icon={faStar} />
                      ))}
                    </div>

                    <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed italic mb-6">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200/80">
                    <span className="font-bold text-gray-900 block text-xs">{t.author}</span>
                    <span className="text-[11px] text-gray-500 block">{t.location}</span>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#6B4B63]">{t.system}</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        {t.savings}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Frequently Asked Questions (FAQ) Accordion */}
        <section id="faq" className="py-20 sm:py-24 bg-slate-50/60 border-b border-gray-200">
          <div className="max-w-[900px] mx-auto px-6">
            <div className="text-center mb-14">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Got Questions?
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Frequently Asked Questions
                </ScriptHeading>
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                Everything you need to know about rooftop solar, DISCOM net-metering, and government subsidies.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-gray-900 text-sm hover:text-[#6B4B63] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <FontAwesomeIcon
                        icon={isOpen ? faChevronUp : faChevronDown}
                        className="text-xs text-gray-400 shrink-0"
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center text-xs text-gray-500">
              Still have questions? Read our{' '}
              <Link to="/schemes" className="text-[#6B4B63] font-bold hover:underline">
                Government Subsidy Guide
              </Link>{' '}
              or speak with a technical advisor.
            </div>
          </div>
        </section>

        {/* 10. High-Impact Call to Action Banner */}
        <section className="py-16 sm:py-20 bg-gradient-to-r from-[#6B4B63] via-[#583D51] to-[#714B67] text-white select-text">
          <div className="max-w-[1320px] mx-auto px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <span className="text-xs uppercase tracking-widest text-teal-300 font-bold block mb-2">
                Start Saving Today
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
                Ready to Zero Your Electricity Bills with Clean Solar?
              </h2>
              <p className="text-white/85 text-base sm:text-lg mb-8 leading-relaxed">
                Join over 500+ satisfied homeowners. Schedule your 100% free rooftop shadow analysis and get your direct subsidy estimate within 24 hours.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/customer"
                  className="w-full sm:w-auto bg-[#5CC9B0] hover:bg-[#48B79E] text-teal-950 font-bold text-[15px] px-8 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faCalendarCheck} />
                  <span>Book Free Technical Survey</span>
                </Link>

                <Link
                  to="/packages"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold text-[15px] px-8 py-3.5 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faSolarPanel} />
                  <span>Browse Turnkey Packages</span>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 mt-8 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-teal-300" />
                  <span>No upfront obligation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-teal-300" />
                  <span>₹78k PM Surya Ghar eligibility</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-teal-300" />
                  <span>25-year tier-1 warranty</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 11. Footer */}
      <SiteFooter />
    </div>
  );
};
