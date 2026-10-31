/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      fontSize: {
        base: ['13.5px', '20px'],
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
