/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: {
          DEFAULT: '#6B4B63',
          dark: '#55394e',
          light: '#7e5a75',
        },
        'accent-plum': '#714B67',
        'teal-brush': '#5CC9B0',
        'page-bg': '#FFFFFF',
        'footer-bg': '#F4F2F2',
        'heading-dark': '#212529',
        'body-grey': '#6C757D',
        odoo: {
          primary: '#714B67',
          'primary-dark': '#5a3b52',
          accent: '#017E84',
          'accent-dark': '#01666b',
          bg: '#F9FAFB',
          sheet: '#FFFFFF',
          text: '#212529',
          muted: '#6C757D',
          border: '#DEE2E6',
          success: '#28A745',
          warning: '#FFC107',
          danger: '#DC3545',
          info: '#17A2B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        script: ['"Caveat Brush"', 'Caveat', 'cursive'],
      },
      maxWidth: {
        'site': '1320px',
      },
      lineHeight: {
        'relaxed-body': '1.9',
      },
      fontSize: {
        base: ['13.5px', '20px'],
        'body-lg': ['18px', '1.9'],
        'display': ['68px', '1.15'],
      },
      borderRadius: {
        DEFAULT: '3.5px',
        md: '4px',
        lg: '6px',
      }
    },
  },
  plugins: [],
}

