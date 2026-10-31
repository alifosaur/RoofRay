import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { SquiggleLink } from '../../components/common/SquiggleLink';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalculator,
  faLandmark,
  faCheckCircle,
  faArrowRight,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';

export const GovtSchemesPage: React.FC = () => {
  const [capacityKw, setCapacityKw] = useState<number>(3.0);
  const [systemType, setSystemType] = useState<string>('On-Grid');
  const [stateName, setStateName] = useState<string>('Delhi');

  const [estimate, setEstimate] = useState<any | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [schemes, setSchemes] = useState<any[]>([]);

  // Fetch schemes from backend
  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const data = await api.get<any[]>('/customer/schemes');
        setSchemes(data || []);
      } catch (err) {
        console.error('Failed to load schemes', err);
      }
    };
    fetchSchemes();
  }, []);

  // Recalculate subsidy estimation
  const handleCalculate = async () => {
    try {
      setCalculating(true);
      const res = await api.post('/customer/schemes/estimate', {
        system_type: systemType,
        capacity_kw: Number(capacityKw),
        state: stateName,
      });
      setEstimate(res);
    } catch (err) {
      console.error('Failed to estimate subsidy', err);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [capacityKw, systemType, stateName]);

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      <SiteNavbar />

      <main className="flex-1 pb-24">
        {/* Header Section */}
        <section className="bg-slate-50 py-16 sm:py-20 border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6 text-center">
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              Ministry of New & Renewable Energy (MNRE)
            </span>
            <div className="mt-2 flex justify-center">
              <ScriptHeading as="h1" underline align="center">
                Government Solar Schemes
              </ScriptHeading>
            </div>
            <p className="mt-6 text-lg text-[#6C757D] max-w-2xl mx-auto body-paragraph">
              Understand Central and State rooftop solar financial assistance, calculate your PM Surya Ghar subsidy in real time, and let SunPower manage the entire portal submission for you.
            </p>
          </div>
        </section>

        {/* Subsidy Calculator Section */}
        <section className="py-16 max-w-[1320px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Calculator Controls (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl shadow-subtle border border-gray-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-plum/10 text-plum flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faCalculator} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#212529]">PM Surya Ghar Calculator</h3>
                  <p className="text-xs text-[#6C757D]">Live Central DBT Subsidy Estimator</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                    System Type
                  </label>
                  <select
                    value={systemType}
                    onChange={(e) => setSystemType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                  >
                    <option value="On-Grid">On-Grid (Eligible for Central Subsidy)</option>
                    <option value="Off-Grid">Off-Grid (Battery System - Subsidy Ineligible)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-[#212529]">
                      System Capacity: <span className="text-[#6B4B63] font-bold">{capacityKw} kW</span>
                    </label>
                    <span className="text-xs text-gray-400">1.0 to 5.0 kW</span>
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
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                    <span>1 kW</span>
                    <span>2 kW</span>
                    <span>3 kW (Cap ₹78K)</span>
                    <span>4 kW</span>
                    <span>5 kW</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                    Installation State
                  </label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20"
                  >
                    <option value="Delhi">Delhi NCR (Includes State GBI incentive)</option>
                    <option value="Maharashtra">Maharashtra (MSEDCL)</option>
                    <option value="Gujarat">Gujarat (GUVNL)</option>
                    <option value="Karnataka">Karnataka (BESCOM)</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (UPPCL)</option>
                    <option value="Haryana">Haryana (DHBVN)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Estimation Results (7 cols) */}
            <div className="lg:col-span-7 bg-[#F8F4F7]/60 rounded-xl border border-plum/15 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-plum">
                  Subsidy Assessment Breakdown
                </span>
                <h3 className="text-2xl font-bold text-[#212529] mt-1 mb-6">
                  {capacityKw} kW {systemType} System in {stateName}
                </h3>

                {estimate ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-5 border border-gray-200/80 shadow-xs space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Estimated Gross System Cost:</span>
                        <span className="font-semibold text-gray-900">
                          ₹{estimate.gross_cost?.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm text-[#5CC9B0]">
                        <span className="font-medium">Central Subsidy (PM Surya Ghar):</span>
                        <span className="font-bold text-base">
                          -₹{estimate.central_subsidy?.toLocaleString()}
                        </span>
                      </div>

                      {estimate.state_subsidy > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span className="font-medium">State Solar Top-Up / GBI:</span>
                          <span className="font-bold">
                            -₹{estimate.state_subsidy?.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-baseline">
                        <span className="text-base font-bold text-[#212529]">Net Consumer Investment:</span>
                        <span className="text-3xl font-extrabold text-[#6B4B63]">
                          ₹{estimate.net_cost?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-white/80 rounded-lg border border-gray-200 text-xs text-[#6C757D] leading-relaxed">
                      <p className="font-semibold text-[#212529] mb-1">Calculation Breakdown:</p>
                      <p>{estimate.subsidy_breakdown}</p>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-gray-500 pt-2">
                      <FontAwesomeIcon icon={faInfoCircle} className="text-[#5CC9B0]" />
                      <span>{estimate.disclaimer}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    {calculating ? 'Calculating subsidy rates...' : 'Select parameters on left'}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-plum/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-gray-600">
                  Ready to lock in your central subsidy approval?
                </span>
                <Link
                  to="/customer"
                  className="bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold px-6 py-2.5 rounded text-sm transition-colors shadow-xs"
                >
                  Apply & Schedule Survey
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 6-Stage Subsidy Roadmap */}
        <section className="py-16 bg-slate-50 border-t border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
                End-to-End Compliance
              </span>
              <div className="mt-2 flex justify-center">
                <ScriptHeading as="h2" align="center">
                  National Solar Portal Paperwork Stages
                </ScriptHeading>
              </div>
              <p className="mt-4 text-[#6C757D] text-base body-paragraph">
                SunPower handles 100% of DISCOM liaison and portal uploads so you never need to visit a government office.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'National Portal Registration',
                  desc: 'We register your consumer CA number with the DISCOM database and MNRE National Solar Portal.',
                },
                {
                  step: '02',
                  title: 'Technical Feasibility Approval',
                  desc: 'The electricity board verifies transformer loading and approves net-metering feasibility in writing.',
                },
                {
                  step: '03',
                  title: 'Vendor Installation & Sizing',
                  desc: 'SunPower certified technicians install Tier-1 components meeting strict ALMM and BIS specifications.',
                },
                {
                  step: '04',
                  title: 'Net-Meter Inspection',
                  desc: 'DISCOM engineers inspect installation earthing, wiring conduits, and synchronize the bi-directional meter.',
                },
                {
                  step: '05',
                  title: 'Commissioning Certificate',
                  desc: 'DISCOM releases the official net-meter commissioning report and uploads it to the national portal.',
                },
                {
                  step: '06',
                  title: 'Direct Bank Disbursal (DBT)',
                  desc: 'MNRE releases your sanctioned subsidy directly into your bank account within 30 days of commissioning.',
                },
              ].map((stage, sIdx) => (
                <div key={sIdx} className="bg-white rounded-lg p-6 border border-gray-200 shadow-xs">
                  <span className="text-2xl font-black text-plum/30 font-mono">{stage.step}</span>
                  <h4 className="font-bold text-base text-[#212529] mt-2 mb-2">{stage.title}</h4>
                  <p className="text-sm text-[#6C757D] leading-relaxed">{stage.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
