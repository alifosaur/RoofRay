import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
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
  id: number;
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
  popular?: boolean;
}

// Maps an API package (BOM template + catalogue prices) to the card shape below
export function toPackageItem(p: any): PackageItem {
  const part = (cat: string) => p.components.find((c: any) => c.category === cat);
  const label = (c: any) => (c ? `${c.quantity} × ${c.name} (${c.warranty_years}-yr warranty)` : '—');
  return {
    id: p.id,
    name: p.name,
    type: p.system_type,
    capacityKw: p.capacity_kw,
    tagline: p.description || '',
    grossPrice: p.gross_price,
    subsidyAmount: p.subsidy_amount,
    monthlyGeneration: `~${p.monthly_generation_units} units / month`,
    panelCount: label(part('panel')),
    inverterSpec: label(part('inverter')),
    batterySpec: part('battery') ? label(part('battery')) : undefined,
  };
}

export const PackagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'ALL' | 'On-Grid' | 'Off-Grid'>('ALL');
  const [packages, setPackages] = useState<PackageItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPackages = () => {
    setLoadError(null);
    api
      .get<any[]>('/customer/packages')
      .then((data) => setPackages(data.map(toPackageItem)))
      .catch((err) => setLoadError(err.message || 'Could not load packages'));
  };

  useEffect(loadPackages, []);

  const visiblePackages = (packages || []).filter(
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
                All Packages ({packages?.length ?? 0})
              </button>
              <button
                onClick={() => setFilterType('On-Grid')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterType === 'On-Grid'
                    ? 'bg-[#6B4B63] text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                On-Grid Systems (Subsidy Eligible)
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
          {loadError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center justify-between">
              <span>{loadError}</span>
              <button onClick={loadPackages} className="font-semibold underline">Retry</button>
            </div>
          )}
          {!packages && !loadError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-96 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {packages && visiblePackages.length === 0 && (
            <div className="p-10 text-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl">
              No packages published yet.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visiblePackages.map((pkg) => {
              const isEligible = pkg.type === 'On-Grid' || pkg.subsidyAmount > 0;

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

                    {/* Pricing & Subsidy Eligibility */}
                    <div className="bg-gray-50/70 border border-gray-200/60 rounded-lg p-4 mb-6 space-y-2.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-gray-600">Turnkey Package Price:</span>
                        <span className="text-2xl font-extrabold text-[#6B4B63]">
                          ₹{pkg.grossPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Govt Subsidy:</span>
                        {isEligible ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-[10px]" />
                            Eligible
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200">
                            Not Eligible
                          </span>
                        )}
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
