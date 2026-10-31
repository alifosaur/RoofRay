import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteNavbar } from '../../components/layout/SiteNavbar';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { ScriptHeading } from '../../components/common/ScriptHeading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faPhoneAlt,
  faEnvelope,
  faHeadset,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

interface FAQItem {
  question: string;
  answer: string;
}

export const HelpPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: 'How much shadow-free roof area do I need for a solar system?',
      answer:
        'A standard rooftop solar installation requires approximately 100 square feet of shadow-free rooftop space per 1 kW of installed capacity. For example, a 3 kW system requires roughly 300 to 350 sq. ft. of clear south/south-west terrace area.',
    },
    {
      question: 'How does grid net-metering work?',
      answer:
        'With a bi-directional net-meter, solar power generated during peak daylight hours directly powers your home appliances first. Any excess electricity is automatically exported to your DISCOM grid. At night, you import power from the grid as normal. Your monthly electricity bill reflects only the net difference!',
    },
    {
      question: 'What warranties and service guarantees are provided?',
      answer:
        'SunPower provides an authentic 25-year linear performance warranty on solar panels (guaranteeing >= 80% output after 25 years), 2 years warranty on inverters and charge controllers, and 2 years warranty on battery storage units. Every serial number is barcode-tracked in your customer portal.',
    },
    {
      question: 'How much government subsidy can I receive under PM Surya Ghar?',
      answer:
        'Under the central PM Surya Ghar: Muft Bijli Yojana, residential consumers receive ₹30,000 per kW for the first 2 kW (₹60,000 total) and ₹18,000 for the 3rd kW, capping at ₹78,000 for 3 kW and higher systems. Subsidies are disbursed directly via DBT into your Aadhaar-linked bank account.',
    },
    {
      question: 'What happens during cloudy days or rainy monsoons?',
      answer:
        'Solar panels work on ambient daylight radiation, not heat. While generation drops to approximately 30-40% on heavily overcast or rainy days, your system remains synchronized with the electrical grid, ensuring zero power interruption.',
    },
    {
      question: 'How do I track my installation progress and raise tickets?',
      answer:
        'Once you accept a quote, you can sign in to the SunPower Customer Portal to view our real-time 13-stage project tracker. After installation, you can inspect registered hardware serials and raise maintenance tickets with 1-click in your portal.',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col select-text">
      <SiteNavbar />

      <main className="flex-1 pb-24">
        {/* Header Section */}
        <section className="bg-slate-50 py-16 sm:py-20 border-b border-gray-200">
          <div className="max-w-[1320px] mx-auto px-6 text-center">
            <span className="text-xs uppercase tracking-widest text-[#6B4B63] font-bold">
              Customer Support & Knowledgebase
            </span>
            <div className="mt-2 flex justify-center">
              <ScriptHeading as="h1" underline align="center">
                Frequently Asked Questions
              </ScriptHeading>
            </div>
            <p className="mt-6 text-lg text-[#6C757D] max-w-2xl mx-auto body-paragraph">
              Everything you need to know about rooftop solar feasibility, net-metering, subsidies, and warranty protection.
            </p>
          </div>
        </section>

        {/* FAQs & Contact Grid */}
        <section className="py-16 max-w-[1320px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Accordion FAQs (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 bg-white shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full text-left p-5 sm:p-6 flex items-center justify-between font-bold text-[#212529] text-base sm:text-lg hover:text-[#6B4B63] transition-colors focus:outline-none"
                    >
                      <span>{faq.question}</span>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`text-sm text-gray-400 ml-4 transition-transform duration-200 flex-shrink-0 ${
                          isOpen ? 'rotate-180 text-plum' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-6 sm:px-6 text-[#6C757D] text-base leading-relaxed border-t border-gray-100 pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Contact Card (4 cols) */}
            <div className="lg:col-span-4 bg-[#F8F4F7]/60 border border-plum/15 rounded-xl p-8 sticky top-24">
              <div className="w-12 h-12 rounded-xl bg-plum text-white flex items-center justify-center text-xl mb-6 shadow-xs">
                <FontAwesomeIcon icon={faHeadset} />
              </div>
              <h3 className="text-xl font-bold text-[#212529] mb-2">Need Direct Assistance?</h3>
              <p className="text-sm text-[#6C757D] mb-6 leading-relaxed">
                Our solar engineers are available Monday through Saturday, 9:00 AM to 6:30 PM to answer your technical questions.
              </p>

              <div className="space-y-4 text-sm text-[#495057] mb-8">
                <div className="flex items-center space-x-3">
                  <FontAwesomeIcon icon={faPhoneAlt} className="text-plum w-4" />
                  <a href="tel:+919811000000" className="hover:underline font-semibold text-[#212529]">
                    +91 (011) 4567-8900
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <FontAwesomeIcon icon={faEnvelope} className="text-plum w-4" />
                  <a href="mailto:support@sunpower.com" className="hover:underline">
                    support@sunpower.com
                  </a>
                </div>
              </div>

              <Link
                to="/#quote-section"
                className="w-full bg-[#6B4B63] hover:bg-[#583D51] text-white font-bold py-3 rounded text-sm text-center block transition-colors shadow-xs"
              >
                Request a Callback
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
