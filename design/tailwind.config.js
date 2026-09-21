/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: '#0D1117',
        subtle: '#161B22',
        surface: '#1C2128',
        elevated: '#22282F',
        line: '#30363D',
        'line-strong': '#3D444D',
        ink: '#F0F6FC',
        muted: '#8B949E',
        faint: '#6E7681',
        accent: {
          DEFAULT: '#3B82F6',
          hover: '#2F6FE0',
          soft: '#132339',
        },
        success: { DEFAULT: '#3FB950', soft: '#0F2818' },
        warning: { DEFAULT: '#D29922', soft: '#2B2008' },
        danger: { DEFAULT: '#F85149', soft: '#2D1214' },
        info: { DEFAULT: '#58A6FF', soft: '#0F2338' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['13px', '20px'],
        md: ['14px', '21px'],
        lg: ['16px', '24px'],
        xl: ['19px', '26px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '5px',
        lg: '6px',
        xl: '8px',
      },
      boxShadow: {
        pop: '0 12px 32px -8px rgba(1,4,9,0.85), 0 0 0 1px #30363D',
      },
    },
  },
  plugins: [],
}
