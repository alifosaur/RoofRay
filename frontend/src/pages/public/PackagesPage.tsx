import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { SquiggleLink } from '../../components/common/SquiggleLink';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faBolt,
  faBatteryFull,
  faShieldAlt,
  faTools,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

interface PackageItem {
  id: string;
  name: string;
  type: 'On-Grid' | 'Off-Grid';
  capacityKw: number;
  tagline: string;
  grossPrice: number;
  subsidyAmount: number;
  monthlyGeneration: string;
  panelCount: string;
  inverterSpec: string;
  batterySpec?: string;
  recommendedFor: string;
  popular?: boolean;
}

export const PackagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'ALL' | 'On-Grid' | 'Off-Grid'>('ALL');
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  const PACKAGES: PackageItem[] = [
    {
      id: 'on-grid-1kw',
      name: '1 kW Compact On-Grid',
      type: 'On-Grid',
      capacityKw: 1.0,
      tagline: 'Ideal for 1-2 BHK apartments or basic lighting load',
      grossPrice: 58000,
      subsidyAmount: 30000,
      monthlyGeneration: '120 - 140 Units',
      panelCount: '2 × 550W Mono PERC Panels',
      inverterSpec: '1.5 kW Single-phase Smart String Inverter (IP65)',
      recommendedFor: 'Basic residential apartments with small rooftops (100 sq.ft.)',
    },
    {
      id: 'on-grid-2kw',
      name: '2 kW Smart On-Grid',
      type: 'On-Grid',
      capacityKw: 2.0,
      tagline: 'Best for standard 2-3 BHK homes with refrigerator & 1 AC',
      grossPrice: 115000,
      subsidyAmount: 60000,
      monthlyGeneration: '240 - 280 Units',
      panelCount: '4 × 550W Mono PERC Panels',
      inverterSpec: '2.5 kW Smart On-Grid Inverter with Wi-Fi Logger',
      recommendedFor: 'Homes with monthly bills between ₹2,000 - ₹3,500',
    },
    {
      id: 'on-grid-3kw',
      name: '3 kW Popular Residential',
      type: 'On-Grid',
      capacityKw: 3.0,
      tagline: 'Maximum central subsidy benefit under PM Surya Ghar Yojana',
      grossPrice: 165000,
      subsidyAmount: 78000,
      monthlyGeneration: '360 - 420 Units',
      panelCount: '6 × 550W Bi-facial Half-Cut Panels',
      inverterSpec: '3.3 kW High-efficiency String Inverter (98.2% efficiency)',
      recommendedFor: '3-4 BHK homes with multiple ACs targeting ₹0 bills',
      popular: true,
    },
    {
      id: 'on-grid-5kw',
      name: '5 kW Commercial & Villa',
      type: 'On-Grid',
      capacityKw: 5.0,
      tagline: 'High yield for large residences, clinics, and offices',
      grossPrice: 265000,
      subsidyAmount: 78000,
      monthlyGeneration: '600 - 700 Units',
      panelCount: '10 × 550W TopCon High Efficiency Panels',
      inverterSpec: '5 kW Dual-MPPT Three-phase/Single-phase Inverter',
      recommendedFor: 'Independent villas, small factories, and high-power consumers',
    },
    {
      id: 'off-grid-3kw',
      name: '3 kW Off-Grid with Battery Bank',
      type: 'Off-Grid',
      capacityKw: 3.0,
      tagline: 'Complete grid independence with lithium-ion / lead-acid backup',
      grossPrice: 245000,
      subsidyAmount: 0,
      monthlyGeneration: '360 - 400 Units + Night Backup',
      panelCount: '6 × 550W Mono PERC Panels',
      inverterSpec: '3.5 kW Hybrid Solar Inverter with MPPT Solar Charger',
      batterySpec: '5.12 kWh LiFePO4 Battery Bank (10-year design life)',
      recommendedFor: 'Areas with frequent power cuts or farmhouses with unstable grid',
    },
    {
      id: 'off-grid-5kw',
      name: '5 kW Heavy-Duty Off-Grid',
      type: 'Off-Grid',
      capacityKw: 5.0,
      tagline: 'Autonomous continuous power for remote properties and factories',
      grossPrice: 385000,
      subsidyAmount: 0,
      monthlyGeneration: '600 - 680 Units + Full Day Backup',
      panelCount: '10 × 550W Mono PERC Panels',
      inverterSpec: '6 kW Hybrid Inverter with Smart Generator Interface',
      batterySpec: '10.24 kWh Expandable Lithium Energy Storage System',
      recommendedFor: 'Rural schools, commercial establishments, and luxury estates',
    },
  ];

  const visiblePackages = PACKAGES.filter(
    (p) => filterType === 'ALL' || p.type === filterType
  );

  const handleInterestClick = (pkg: PackageItem) => {
    navigate('/customer', { state: { preferredKw: pkg.capacityKw, preferredType: pkg.type } });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      <SiteNavbar />

      <main className="flex-1 pb-24">
        {/* Header Section */}
        <section className="bg-slate-50 py-16 sm:py-20 border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6 text-center">
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              Turnkey Solar Packages
            </span>
            <div className="mt-2 flex justify-center">
              <ScriptHeading as="h1" underline align="center">
                Solar Systems & Pricing
              </ScriptHeading>
            </div>
            <p className="mt-6 text-lg text-[#6C757D] max-w-2xl mx-auto body-paragraph">
              All packages include certified tier-1 solar panels, smart inverters, mounting structures, wiring, DISCOM net-metering synchronization, and direct assistance for{' '}
              <SquiggleLink to="/schemes">government subsidies</SquiggleLink>.
            </p>

            {/* Filter Pills */}
            <div className="flex items-center justify-center space-x-3 mt-10">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'ALL'
                    ? 'bg-[#6B4B63] text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Packages ({PACKAGES.length})
              </button>
              <button
                onClick={() => setFilterType('On-Grid')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'On-Grid'
                    ? 'bg-[#6B4B63] text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                On-Grid Systems (Subsidized)
              </button>
              <button
                onClick={() => setFilterType('Off-Grid')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'Off-Grid'
                    ? 'bg-[#6B4B63] text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Off-Grid Systems (Battery Storage)
              </button>
            </div>
          </div>
        </section>

        {/* Packages Grid */}
        <section className="py-16 max-w-[1320px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visiblePackages.map((pkg) => {
              const netPrice = pkg.grossPrice - pkg.subsidyAmount;

              return (
                <div
                  key={pkg.id}
                  className={`rounded-xl border transition-all duration-200 p-8 flex flex-col justify-between ${
                    pkg.popular
                      ? 'border-[#6B4B63] shadow-md relative bg-gradient-to-b from-white to-[#F8F4F7]/40 ring-2 ring-[#6B4B63]/20'
                      : 'border-gray-200 shadow-xs hover:border-gray-300 bg-white'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3.5 right-6 bg-[#6B4B63] text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-plum/10 text-plum uppercase tracking-wide">
                        {pkg.type}
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        {pkg.capacityKw} kW System
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-[#212529] mb-2">{pkg.name}</h3>
                    <p className="text-sm text-[#6C757D] mb-6 leading-relaxed">
                      {pkg.tagline}
                    </p>

                    {/* Pricing Breakdown */}
                    <div className="bg-gray-50/70 border border-gray-200/60 rounded-lg p-4 mb-6 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Gross System Cost:</span>
                        <span className="font-semibold text-gray-800">
                          ₹{pkg.grossPrice.toLocaleString()}
                        </span>
                      </div>
                      {pkg.subsidyAmount > 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#5CC9B0] font-medium">PM Surya Ghar Subsidy:</span>
                          <span className="font-bold text-[#5CC9B0]">
                            -₹{pkg.subsidyAmount.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Central Subsidy:</span>
                          <span>Ineligible (Off-Grid)</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-dashed border-gray-300 flex justify-between items-baseline">
                        <span className="text-sm font-bold text-[#212529]">Net Investment:</span>
                        <span className="text-2xl font-extrabold text-[#6B4B63]">
                          ₹{netPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* BOM & Specifications List */}
                    <div className="space-y-3 text-sm text-[#495057] mb-8">
                      <div className="flex items-start">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#5CC9B0] mt-1 mr-2.5 text-xs flex-shrink-0" />
                        <span><strong>Generation:</strong> {pkg.monthlyGeneration}</span>
                      </div>
                      <div className="flex items-start">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#5CC9B0] mt-1 mr-2.5 text-xs flex-shrink-0" />
                        <span><strong>Hardware:</strong> {pkg.panelCount}</span>
                      </div>
                      <div className="flex items-start">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-[#5CC9B0] mt-1 mr-2.5 text-xs flex-shrink-0" />
                        <span><strong>Inverter:</strong> {pkg.inverterSpec}</span>
                      </div>
                      {pkg.batterySpec && (
                        <div className="flex items-start">
                          <FontAwesomeIcon icon={faBatteryFull} className="text-[#6B4B63] mt-1 mr-2.5 text-xs flex-shrink-0" />
                          <span><strong>Battery Bank:</strong> {pkg.batterySpec}</span>
                        </div>
                      )}
                      <div className="flex items-start">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-[#5CC9B0] mt-1 mr-2.5 text-xs flex-shrink-0" />
                        <span><strong>Warranty:</strong> 25y panels, 2y inverter, 2y battery</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInterestClick(pkg)}
                    className="w-full bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-3 rounded text-sm transition-colors shadow-xs flex items-center justify-center space-x-2"
                  >
                    <span>I'm interested in this system</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
