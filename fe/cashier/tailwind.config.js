/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        rausch: {
          DEFAULT: '#ff385c',
          active: '#e00b41',
          disabled: '#ffd1da',
          error: '#c13515',
          'error-hover': '#b32505'
        },
        ink: '#222222',
        body: '#3f3f3f',
        muted: {
          DEFAULT: '#6a6a6a',
          soft: '#929292'
        },
        hairline: {
          DEFAULT: '#dddddd',
          soft: '#ebebeb'
        },
        'border-strong': '#c1c1c1',
        canvas: '#ffffff',
        surface: {
          soft: '#f7f7f7',
          card: '#ffffff',
          strong: '#f2f2f2'
        },
        luxe: '#460479',
        plus: '#92174d',
        'legal-link': '#428bff'
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '32px',
        full: '9999px'
      },
      boxShadow: {
        airbnb: 'rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px 0, rgba(0, 0, 0, 0.1) 0 4px 8px 0',
        'airbnb-modal': 'rgba(0, 0, 0, 0.15) 0 8px 28px'
      },
      fontFamily: {
        sans: ["'Airbnb Cereal VF'", 'Circular', '-apple-system', 'system-ui', 'Roboto', "'Helvetica Neue'", 'sans-serif']
      }
    }
  },
  plugins: []
};
