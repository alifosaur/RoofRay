import React, { useState } from 'react';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { SquiggleLink } from '../../components/common/SquiggleLink';
import { SplitSection } from '../../components/common/SplitSection';
import { FeatureBand } from '../../components/common/FeatureBand';
import { InfoList } from '../../components/common/InfoList';
import { RooftopSolarIllustration } from '../../components/brand/RooftopSolarIllustration';
import { HappySunIllustration } from '../../components/brand/HappySunIllustration';
import { colors, fonts } from '../../theme/tokens';

export const StyleguidePage: React.FC = () => {
  const [sampleInput, setSampleInput] = useState('');

  const sampleFeatures = [
    { title: 'Lower electricity bills', description: 'Generate your own clean solar energy and cut grid power bills by up to 90% from day one.' },
    { title: 'Government subsidy support', description: 'Direct benefit transfer of up to ₹78,000 under PM Surya Ghar Muft Bijli Yojana with zero paperwork hassle.' },
    { title: 'Certified quality kit', description: 'Tier-1 monocrystalline PERC panels, IP65 smart on-grid inverters, and heavy-duty pre-galvanized structures.' },
  ];

  const sampleInfoItems = [
    { leadIn: 'Enquire', text: 'Submit your roof area and monthly electricity bill in under 2 minutes.' },
    { leadIn: 'Survey', text: 'Certified technician visits your roof to measure tilt, orientation, and shadow-free zones.' },
    { leadIn: 'Quote', text: 'Receive an instant transparent Bill of Materials quote with automated MNRE subsidy deductions.' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNavbar />

      <main className="flex-1">
        {/* Styleguide Header */}
        <section className="bg-slate-50 py-16 border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6 text-center">
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              Design System & Token Architecture
            </span>
            <div className="mt-3 flex justify-center">
              <ScriptHeading as="h1" underline align="center">
                RoofRay Styleguide
              </ScriptHeading>
            </div>
            <p className="mt-6 text-lg text-[#6C757D] max-w-2xl mx-auto">
              Visual tokens, typography, and reusable layout components matching the Odoo-inspired aesthetic reference system.
            </p>
          </div>
        </section>

        {/* 1. Colors & Design Tokens */}
        <section className="py-16 border-b border-gray-100 max-w-[1320px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#212529] mb-8">1. Color Palette Tokens</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            <div className="flex flex-col">
              <div className="h-20 rounded-md bg-[#6B4B63] shadow-xs mb-2"></div>
              <span className="font-bold text-sm text-[#212529]">Primary Plum</span>
              <span className="text-xs font-mono text-gray-500">#6B4B63</span>
            </div>
            <div className="flex flex-col">
              <div className="h-20 rounded-md bg-[#714B67] shadow-xs mb-2"></div>
              <span className="font-bold text-sm text-[#212529]">Accent Plum</span>
              <span className="text-xs font-mono text-gray-500">#714B67</span>
            </div>
            <div className="flex flex-col">
              <div className="h-20 rounded-md bg-[#5CC9B0] shadow-xs mb-2"></div>
              <span className="font-bold text-sm text-[#212529]">Teal Brush</span>
              <span className="text-xs font-mono text-gray-500">#5CC9B0</span>
            </div>
            <div className="flex flex-col">
              <div className="h-20 rounded-md bg-[#F4F2F2] border border-gray-300 shadow-xs mb-2"></div>
              <span className="font-bold text-sm text-[#212529]">Footer Grey</span>
              <span className="text-xs font-mono text-gray-500">#F4F2F2</span>
            </div>
            <div className="flex flex-col">
              <div className="h-20 rounded-md bg-[#212529] shadow-xs mb-2"></div>
              <span className="font-bold text-sm text-[#212529]">Heading Text</span>
              <span className="text-xs font-mono text-gray-500">#212529</span>
            </div>
            <div className="flex flex-col">
              <div className="h-20 rounded-md bg-[#6C757D] shadow-xs mb-2"></div>
              <span className="font-bold text-sm text-[#212529]">Body Grey</span>
              <span className="text-xs font-mono text-gray-500">#6C757D</span>
            </div>
          </div>
        </section>

        {/* 2. Typography & Script Heading */}
        <section className="py-16 border-b border-gray-100 max-w-[1320px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#212529] mb-8">2. Typography & Heading Underlines</h2>
          <div className="space-y-12">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">ScriptHeading with Teal Brush Underline</p>
              <ScriptHeading underline as="h2">
                About RoofRay
              </ScriptHeading>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">Body Paragraph (~18px, Line-height 1.9, Justified)</p>
              <p className="body-paragraph max-w-3xl">
                RoofRay rooftop installations are engineered for maximum solar energy yield, allowing homeowners and small factories to power their daily appliances through clean rooftop generation. Every project is backed by our certified 15-technician crew and an authentic 20-year performance guarantee with automated{' '}
                <SquiggleLink to="/schemes">government subsidy</SquiggleLink> paperwork.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Buttons & Form Fields */}
        <section className="py-16 border-b border-gray-100 max-w-[1320px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#212529] mb-8">3. Buttons & Form Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-bold text-base text-[#212529] mb-4">Button Variants</h3>
              <div className="flex flex-wrap items-center gap-4">
                <button className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-[15px] font-medium px-6 py-2.5 rounded transition-colors shadow-xs">
                  Solid Plum Primary
                </button>
                <button className="border border-[#6B4B63] text-[#6B4B63] hover:bg-[#6B4B63] hover:text-white text-[15px] font-medium px-6 py-2.5 rounded transition-colors">
                  Outlined Secondary
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-[#212529] mb-4">Standard Input with Required Asterisk</h3>
              <div className="max-w-md space-y-1.5">
                <label className="block text-sm font-medium text-[#212529]">
                  Roof Area (in sq. ft.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 450"
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded text-sm text-[#212529] placeholder-gray-400 focus:outline-none focus:border-[#6B4B63] focus:ring-2 focus:ring-[#6B4B63]/20 transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. SplitSection Preview */}
        <div className="border-b border-gray-100">
          <SplitSection
            left={
              <div>
                <ScriptHeading underline className="mb-8">
                  Clean Energy for Every Roof
                </ScriptHeading>
                <p className="body-paragraph mb-4">
                  RoofRay rooftop systems turn unused roof space into an independent clean energy generator. Save up to 90% on electricity bills every month.
                </p>
                <div className="flex items-center space-x-4 mt-8">
                  <button className="bg-[#6B4B63] hover:bg-[#583D51] text-white text-[15px] font-medium px-6 py-2.5 rounded transition-colors shadow-xs">
                    Get a Free Quote
                  </button>
                </div>
              </div>
            }
            right={<RooftopSolarIllustration />}
          />
        </div>

        {/* 5. FeatureBand Preview */}
        <FeatureBand
          title="Why go solar with RoofRay?"
          items={sampleFeatures}
        />

        {/* 6. InfoList Preview */}
        <InfoList
          title="How it works:"
          items={sampleInfoItems}
          secondaryTitle="What if you switch today?"
          secondaryParagraphs={[
            'Switching to solar isn’t just good for the environment—it delivers immediate financial returns with zero maintenance stress.',
            'Our team takes care of all DISCOM liaison, net-metering approvals, and direct-to-bank subsidy disbursal.'
          ]}
          sideIllustrationCaption="Power from your own roof!"
        />
      </main>

      <SiteFooter />
    </div>
  );
};
