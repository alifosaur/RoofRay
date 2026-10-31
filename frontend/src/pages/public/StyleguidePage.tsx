import React, { useState } from 'react';
import {
  SunPowerLogo,
  ScriptHeading,
  SquiggleLink,
  SiteNavbar,
  SplitSection,
  FeatureBand,
  InfoList,
  SiteFooter,
} from '../../components/public';
import { TOKENS } from '../../theme/tokens';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faSun,
  faBolt,
  faShieldAlt,
  faArrowRight,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';

export const StyleguidePage: React.FC = () => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(label);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const COLOR_SWATCHES = [
    {
      name: 'Primary Plum',
      hex: '#6B4B63',
      variable: 'bg-plum / text-plum',
      usage: 'Feature bands, main brand surfaces, buttons, active accents',
      textColor: 'text-white',
    },
    {
      name: 'Accent / Wordmark Plum',
      hex: '#714B67',
      variable: 'bg-accent-plum / text-accent-plum',
      usage: 'Logo wordmark, links, squiggles, secondary headers',
      textColor: 'text-white',
    },
    {
      name: 'Teal Brush Stroke',
      hex: '#5CC9B0',
      variable: 'text-teal-brush / bg-teal-brush',
      usage: 'Hand-drawn brush underline under script headings',
      textColor: 'text-heading-dark',
    },
    {
      name: 'Heading Dark',
      hex: '#212529',
      variable: 'text-heading-dark',
      usage: 'Primary display titles, section headings, high contrast text',
      textColor: 'text-white',
    },
    {
      name: 'Body Grey',
      hex: '#6C757D',
      variable: 'text-body-grey',
      usage: 'Standard body text (18px, 1.9 line-height), secondary labels',
      textColor: 'text-white',
    },
    {
      name: 'Footer Light Grey',
      hex: '#F4F2F2',
      variable: 'bg-footer-bg',
      usage: 'Site footer background, subtle card surface',
      textColor: 'text-heading-dark',
      border: true,
    },
    {
      name: 'Page White',
      hex: '#FFFFFF',
      variable: 'bg-page-bg',
      usage: 'Main page canvas, navbar, card backgrounds',
      textColor: 'text-heading-dark',
      border: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-heading-dark flex flex-col font-sans selection:bg-plum selection:text-white">
      {/* Live SiteNavbar Component */}
      <SiteNavbar />

      {/* Styleguide Header Banner */}
      <div className="bg-gray-50 border-b border-gray-200 py-10 px-6">
        <div className="max-w-site mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-plum mb-2 bg-purple-50 px-2.5 py-1 rounded">
              <span>Step 1: Visual Tokens & Shared Components</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-heading-dark">
              SunPower Odoo-Style Design System
            </h1>
            <p className="text-body-grey text-base mt-1">
              Matching the reference screenshots: Plum palette, Caveat Brush display headings,
              teal brush underlines, and Inter typography.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              Tokens Active
            </span>
            <span className="px-3 py-1.5 bg-purple-50 text-plum border border-purple-200 rounded-md font-medium">
              Font: Caveat Brush + Inter
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-20 py-12">
        {/* SECTION 1: Color Palette Tokens */}
        <section className="max-w-site mx-auto px-6">
          <div className="border-b border-gray-200 pb-4 mb-8">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Design Token Foundation
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              1. Color Tokens & Swatches
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLOR_SWATCHES.map((swatch) => (
              <div
                key={swatch.hex}
                className="rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow transition-shadow group cursor-pointer"
                onClick={() => copyToClipboard(swatch.hex, swatch.name)}
              >
                <div
                  className={`h-24 p-4 flex flex-col justify-between ${swatch.textColor} ${
                    swatch.border ? 'border-b border-gray-200' : ''
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                >
                  <span className="text-xs font-mono font-semibold uppercase opacity-90">
                    {swatch.hex}
                  </span>
                  <span className="text-xs opacity-75 font-mono">
                    {copiedToken === swatch.name ? '✓ Copied!' : 'Click to copy hex'}
                  </span>
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-heading-dark text-base">{swatch.name}</h3>
                  <code className="text-xs font-mono text-plum block mt-0.5">
                    {swatch.variable}
                  </code>
                  <p className="text-xs text-body-grey mt-2 line-clamp-2">{swatch.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Typography & Script Headings */}
        <section className="max-w-site mx-auto px-6">
          <div className="border-b border-gray-200 pb-4 mb-8">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Typography System
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              2. Typography & Script Headings
            </h2>
          </div>

          <div className="space-y-12 bg-gray-50/50 p-8 rounded-xl border border-gray-100">
            {/* Display Script Heading with Teal Underline */}
            <div>
              <p className="text-xs font-semibold text-body-grey uppercase tracking-wider mb-2">
                Display Script Heading with Teal Brush Stroke (&lt;ScriptHeading withTealUnderline /&gt;)
              </p>
              <div className="py-4">
                <ScriptHeading withTealUnderline size="display">
                  About SunPower Rooftop Solar
                </ScriptHeading>
              </div>
            </div>

            {/* Script Heading on Dark Surface */}
            <div className="bg-plum p-8 rounded-lg">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                White Script Heading on Plum Band (&lt;ScriptHeading variant="white" /&gt;)
              </p>
              <div className="text-center py-4">
                <ScriptHeading variant="white" size="display">
                  Why rooftop solar is your best clean investment?
                </ScriptHeading>
              </div>
            </div>

            {/* Sizes Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-xs text-body-grey font-mono mb-2">size="sm" (~32px)</p>
                <ScriptHeading size="sm">Open challenge:</ScriptHeading>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-xs text-body-grey font-mono mb-2">size="md" (~44px)</p>
                <ScriptHeading size="md">What if you win?</ScriptHeading>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-xs text-body-grey font-mono mb-2">size="lg" (~56px)</p>
                <ScriptHeading size="lg">Clean Power Journey</ScriptHeading>
              </div>
            </div>

            {/* Body Text Specs */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-heading-dark uppercase tracking-wider">
                  Body Typography Spec: 18px / 1.9 line-height (Justified on desktop, left on mobile)
                </p>
                <span className="text-xs text-body-grey font-mono">Font: Inter 400</span>
              </div>
              <p className="text-[17px] md:text-[18px] leading-[1.85] md:leading-[1.9] text-body-grey text-left md:text-justify font-normal">
                SunPower India solar installations are engineered for maximum kWh yield across Indian
                climatic zones. Our high-efficiency mono-crystalline solar panels are tested against
                extreme hail, monsoon deluges, and heavy dust storms. With integrated Tier-1 microinverters
                and automated net-metering dispatch, every home produces free, clean, independent power.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: Brand Logo & Wordmark */}
        <section className="max-w-site mx-auto px-6">
          <div className="border-b border-gray-200 pb-4 mb-8">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Brand Identity
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              3. SunPower SVG Wordmark Logo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center space-y-3">
              <SunPowerLogo size="lg" />
              <span className="text-xs text-body-grey font-mono">Standard Wordmark (size="lg")</span>
            </div>

            <div className="p-8 bg-plum rounded-lg flex flex-col items-center justify-center space-y-3">
              <SunPowerLogo size="lg" variant="white" />
              <span className="text-xs text-white/75 font-mono">White Inverted (size="lg")</span>
            </div>

            <div className="p-8 bg-footer-bg rounded-lg border border-gray-200 flex flex-col items-center justify-center space-y-3">
              <SunPowerLogo size="sm" />
              <span className="text-xs text-body-grey font-mono">Compact Navbar Size (size="sm")</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: Squiggle Link Component */}
        <section className="max-w-site mx-auto px-6">
          <div className="border-b border-gray-200 pb-4 mb-8">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Interactive Accent
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              4. Squiggle Link (&lt;SquiggleLink /&gt;)
            </h2>
          </div>

          <div className="p-8 bg-gray-50 rounded-xl border border-gray-200 space-y-6">
            <p className="text-sm text-body-grey">
              The reference design uses a distinctive purple hand-drawn SVG squiggle underline under
              one key promotional phrase per page (e.g. <em>hiring hackathons</em>).
            </p>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-[17px] md:text-[18px] leading-[1.85] md:leading-[1.9] text-body-grey text-left md:text-justify">
                Every residential rooftop solar project commissioned through SunPower automatically qualifies
                for the direct DBT{' '}
                <SquiggleLink to="/schemes">
                  PM Surya Ghar national government subsidy
                </SquiggleLink>
                , crediting up to ₹78,000 straight into your Aadhaar-linked savings account without any middleman
                or red tape.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: Split Section Preview */}
        <section className="max-w-site mx-auto px-6">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Layout Structure
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              5. Split Section (&lt;SplitSection /&gt;)
            </h2>
          </div>
        </section>

        {/* Live Split Section Preview */}
        <SplitSection
          leftContent={
            <div className="space-y-6">
              <ScriptHeading withTealUnderline size="display">
                About SunPower Solar
              </ScriptHeading>
              <p className="text-[17px] md:text-[18px] leading-[1.85] md:leading-[1.9] text-body-grey text-left md:text-justify">
                SunPower India rooftop installations are open to all homeowners, commercial complexes,
                and housing societies aiming to achieve zero electricity bills while cutting corporate
                and family carbon footprints.
              </p>
              <p className="text-[17px] md:text-[18px] leading-[1.85] md:leading-[1.9] text-body-grey text-left md:text-justify">
                Our solar engineering journey began with a mission to make rooftop solar transparent,
                durable, and free of bureaucratic hassles. Today, we have replaced noisy diesel generator sets
                and high utility tariffs with clean, smart{' '}
                <SquiggleLink to="/packages">rooftop solar installations</SquiggleLink>.
              </p>
            </div>
          }
          rightContent={
            <div className="w-full max-w-md bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl">
                <FontAwesomeIcon icon={faSun} />
              </div>
              <h3 className="font-bold text-heading-dark text-xl">
                PM Surya Ghar National Solar Scheme
              </h3>
              <p className="text-body-grey text-sm">
                Get up to ₹78,000 Direct Benefit Transfer subsidy for 1–3 kW rooftop installations.
              </p>
              <div className="py-2">
                <span className="inline-block bg-plum text-white font-bold text-base px-6 py-2 rounded-full shadow-sm">
                  Save ₹1,05,000 / year
                </span>
              </div>
            </div>
          }
        />

        {/* SECTION 6: Feature Band Preview */}
        <div className="border-t border-gray-100 pt-8">
          <div className="max-w-site mx-auto px-6 mb-6">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Full-Width Plum Band
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              6. Plum Feature Band (&lt;FeatureBand /&gt;)
            </h2>
          </div>

          {/* Live Feature Band */}
          <FeatureBand />
        </div>

        {/* SECTION 7: Info List with Smiling Mascot */}
        <div className="border-t border-gray-100 pt-8">
          <div className="max-w-site mx-auto px-6 mb-6">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Bullet Checklist & Mascot
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              7. Info List & Smiling Mascot (&lt;InfoList /&gt;)
            </h2>
          </div>

          {/* Live InfoList */}
          <InfoList />
        </div>

        {/* SECTION 8: Buttons & Form Controls */}
        <section className="max-w-site mx-auto px-6">
          <div className="border-b border-gray-200 pb-4 mb-8">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Interactive Elements
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              8. Buttons & Form Elements
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Buttons */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
              <h3 className="font-bold text-heading-dark text-base">Button Variants</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <button className="px-6 py-2.5 bg-plum text-white font-medium rounded hover:bg-plum-dark transition-colors shadow-sm">
                  Primary Plum Button
                </button>
                <button className="px-6 py-2.5 bg-white text-plum border border-plum font-medium rounded hover:bg-purple-50 transition-colors">
                  Outline Plum Button
                </button>
                <button className="px-6 py-2.5 bg-teal-brush text-heading-dark font-medium rounded hover:opacity-90 transition-opacity">
                  Teal Accent Button
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
              <h3 className="font-bold text-heading-dark text-base">Input Styling</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter your phone or email"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded focus:outline-none focus:border-plum text-heading-dark text-sm"
                  readOnly
                  value="9876543210"
                />
                <p className="text-xs text-body-grey">
                  Clean rounded borders with subtle hover and plum focus ring.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: Site Footer Preview */}
        <div className="border-t border-gray-100 pt-8">
          <div className="max-w-site mx-auto px-6 mb-6">
            <span className="text-xs uppercase tracking-widest text-body-grey font-semibold">
              Footer Component
            </span>
            <h2 className="text-2xl font-bold text-heading-dark mt-1">
              9. Three-Column Footer (&lt;SiteFooter /&gt;)
            </h2>
          </div>

          {/* Live SiteFooter */}
          <SiteFooter />
        </div>
      </div>
    </div>
  );
};
