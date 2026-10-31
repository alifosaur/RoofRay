import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  faCalculator,
  faLeaf,
  faAward,
  faQuoteLeft,
  faSolarPanel,
  faRupeeSign,
} from '@fortawesome/free-solid-svg-icons';

export const PublicWebsitePage: React.FC = () => {
  // Solar Savings & Rooftop ROI Calculator state
  const [monthlyBill, setMonthlyBill] = useState<number>(5500);
  const [roofType, setRoofType] = useState<'rcc' | 'metal' | 'shed'>('rcc');

  // Realistic dynamic solar engineering calculations based on benchmark standards
  const calcCapacityKw = Math.min(10, Math.max(1, Math.round((monthlyBill / 950) * 2) / 2));
  const estimatedUnits = Math.round(calcCapacityKw * 125);
  const estimatedSavingsMonthly = Math.min(monthlyBill, Math.round(estimatedUnits * 7.8));
  const estimatedNewBill = Math.max(250, monthlyBill - estimatedSavingsMonthly);
  const subsidyAmount =
    calcCapacityKw >= 3.0 ? 78000 : calcCapacityKw >= 2.0 ? 60000 : 30000;
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
      text: 'Submit your rooftop requirements and current electricity bill to get started with instant feasibility.',
    },
    {
      leadIn: 'Survey',
      text: 'Certified technician visits your roof to measure tilt, orientation, structure strength, and shadow-free zones.',
    },
    {
      leadIn: 'Consultation & Quotation',
      text: 'Our technical advisor prepares a customized quotation according to your roof and client requirements.',
    },
    {
      leadIn: 'Delivery',
      text: 'Tier-1 panels and smart inverters are barcode-scanned and verified from our central warehouse stock.',
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

  const CASE_STUDIES = [
    {
      name: 'Dr. Sunita Bansal',
      location: 'Vasant Kunj, South Delhi',
      system: '4 kW Smart On-Grid System',
      billBefore: '₹ 7,200/mo',
      billAfter: '₹ 480/mo',
      pctReduction: '93%',
      quote:
        'Our monthly electricity bill plummeted from day one. RoofRay took full responsibility for the DISCOM net-metering synchronization and the ₹78,000 PM Surya Ghar subsidy was deposited directly into our bank account with zero fuss.',
      generation: '500 Units / Month',
      warranty: '25-Year Performance Guarantee',
    },
    {
      name: 'Rajesh Mehra',
      location: 'DLF Phase 2, Gurgaon',
      system: '5 kW High-Capacity On-Grid',
      billBefore: '₹ 11,500/mo',
      billAfter: '₹ 1,120/mo',
      pctReduction: '90%',
      quote:
        'Flawless rooftop installation! The crew used heavy-duty pre-galvanized mounting stands and high-efficiency mono PERC panels. Every single panel is registered with its individual barcode in my customer portal.',
      generation: '650 Units / Month',
      warranty: '25-Year Performance Guarantee',
    },
    {
      name: 'Anand Singhal',
      location: 'Sector 62, Noida',
      system: '3 kW Residential Hybrid System',
      billBefore: '₹ 5,400/mo',
      billAfter: '₹ 380/mo',
      pctReduction: '93%',
      quote:
        'Uninterrupted power during outages and complete independence from rising peak power tariffs. The in-house certified technician crew completed earthing and structural testing in under two days.',
      generation: '390 Units / Month',
      warranty: '25-Year Performance Guarantee',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      {/* 1. Header & Navigation */}
      <SiteNavbar />

      <main className="flex-1">
        {/* 2. Hero SplitSection matching Reference Screenshot 1 */}
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
                <Link
                  to="/packages"
                  className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-[15px] font-medium px-7 py-3 rounded text-center transition-colors shadow-xs"
                >
                  Explore Solar Packages
                </Link>
                <Link
                  to="/schemes"
                  className="border border-[#6B4B63] text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white text-[15px] font-medium px-7 py-3 rounded text-center transition-colors"
                >
                  Government Subsidy Guide
                </Link>
              </div>
            </div>
          }
          right={<RooftopSolarIllustration />}
        />

        {/* 3. FeatureBand matching Reference Screenshot 2 */}
        <FeatureBand
          id="features"
          title="Why go solar with RoofRay?"
          items={featureItems}
        />

        {/* 4. REPLACEMENT SECTION 1: Interactive Solar Savings & Rooftop ROI Estimator */}
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
            <div className="max-w-4xl mx-auto bg-gradient-to-b from-white to-[#F8F4F7]/30 rounded-2xl border border-gray-200/90 shadow-md p-6 sm:p-10">
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
                      <span>₹1,500/mo</span>
                      <span>₹10,000/mo</span>
                      <span>₹25,000/mo</span>
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
                    <div className="text-xl font-extrabold text-[#5CC9B0] mt-1">
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

        {/* 5. InfoList matching Reference Screenshot 3 */}
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

        {/* 6. REPLACEMENT SECTION 2: Verified Customer Case Studies & Trust Assurance */}
        <section id="testimonials" className="py-20 sm:py-24 bg-[#F8F4F7]/40 border-t border-gray-100">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                Verified Rooftop Performance
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  Real Homes, Real Solar Savings
                </ScriptHeading>
              </div>
              <p className="mt-4 text-[#6C757D] text-base leading-relaxed">
                Discover how homeowners and businesses across Delhi NCR transformed their rooftops into revenue-generating clean power plants.
              </p>
            </div>

            {/* Case Studies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {CASE_STUDIES.map((study, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200/90 shadow-subtle p-7 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-purple-50 text-[#6B4B63] border border-purple-100">
                        {study.system}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {study.pctReduction} Cut
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-base font-bold text-[#212529]">{study.name}</h3>
                      <p className="text-xs text-gray-500">{study.location}</p>
                    </div>

                    {/* Bill Comparison Strip */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg mb-4 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Monthly Bill Before</span>
                        <span className="font-bold text-gray-600 line-through">{study.billBefore}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Monthly Bill After</span>
                        <span className="font-bold text-emerald-700">{study.billAfter}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#6C757D] italic leading-relaxed mb-6">
                      <FontAwesomeIcon icon={faQuoteLeft} className="text-[#6B4B63]/20 mr-1.5 text-sm" />
                      "{study.quote}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1 text-[#212529] font-bold">
                      <FontAwesomeIcon icon={faBolt} className="text-amber-500" />
                      {study.generation}
                    </span>
                    <span className="flex items-center gap-1 text-[#5CC9B0] font-bold">
                      <FontAwesomeIcon icon={faShieldAlt} />
                      {study.warranty}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Trust Credentials Strip */}
            <div className="mt-14 pt-10 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#6B4B63]">40+</div>
                <div className="text-xs text-gray-600 font-medium mt-1">Projects Monthly</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#6B4B63]">100%</div>
                <div className="text-xs text-gray-600 font-medium mt-1">Serial-Tracked Hardware</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#6B4B63]">₹78,000</div>
                <div className="text-xs text-gray-600 font-medium mt-1">Max Central Subsidy</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#6B4B63]">25 Years</div>
                <div className="text-xs text-gray-600 font-medium mt-1">Performance Warranty</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer matching Reference Screenshot 3 */}
      <SiteFooter />
    </div>
  );
};
