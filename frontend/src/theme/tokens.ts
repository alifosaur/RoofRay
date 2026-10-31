/**
 * Design tokens matching the reference screenshots:
 * - Primary plum: #6B4B63 (feature bands, buttons, hover)
 * - Accent plum: #714B67 (links, wordmark accent)
 * - Teal brush underline: #5CC9B0
 * - Page background: #FFFFFF
 * - Footer background: #F4F2F2
 * - Heading dark: #212529
 * - Body grey: #6C757D
 * - Fonts: Inter for UI/body, Caveat Brush / Caveat for script headings
 */

export const TOKENS = {
  colors: {
    primaryPlum: '#6B4B63',
    primaryPlumDark: '#55394E',
    primaryPlumLight: '#7E5A75',
    accentPlum: '#714B67',
    tealBrush: '#5CC9B0',
    pageBg: '#FFFFFF',
    footerBg: '#F4F2F2',
    headingDark: '#212529',
    bodyGrey: '#6C757D',
    borderLight: '#E5E7EB',
  },
  fonts: {
    heading: '"Caveat Brush", Caveat, cursive',
    body: 'Inter, system-ui, -apple-system, sans-serif',
  },
  typography: {
    bodyText: 'text-[17px] md:text-[18px] leading-[1.85] md:leading-[1.9] text-body-grey',
    bodyJustified: 'text-[17px] md:text-[18px] leading-[1.85] md:leading-[1.9] text-body-grey text-left md:text-justify',
    displayHeading: 'font-script text-4xl sm:text-5xl md:text-6xl lg:text-[68px] tracking-wide text-heading-dark leading-tight',
    displayHeadingWhite: 'font-script text-4xl sm:text-5xl md:text-6xl lg:text-[64px] tracking-wide text-white leading-tight',
    sectionHeading: 'font-script text-3xl sm:text-4xl md:text-5xl text-heading-dark tracking-wide',
  },
  layout: {
    container: 'max-w-site mx-auto px-6',
    sectionVerticalPadding: 'py-16 md:py-24',
    navbarHeight: 'h-16',
    navbarShadow: 'shadow-[0_1px_4px_rgba(0,0,0,0.08)]',
  },
};
