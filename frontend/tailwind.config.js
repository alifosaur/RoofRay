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
          dark: '#583D51',
          accent: '#714B67',
          hover: '#7E5875',
          light: '#F8F4F7',
        },
        'odoo-purple': '#6B4B63',
        teal: {
          brush: '#5CC9B0',
          'brush-dark': '#48B79E',
        },
        odoo: {
          primary: '#6B4B63',
          'primary-dark': '#583D51',
          accent: '#5CC9B0',
          'accent-plum': '#714B67',
          bg: '#FFFFFF',
          footer: '#F4F2F2',
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
        '1320': '1320px',
      },
      fontSize: {
        base: ['15px', '22px'],
        lead: ['18px', '34px'], // ~1.9 line-height as specified
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        navbar: '0 1px 4px rgba(0, 0, 0, 0.08)',
        subtle: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}

