/** @type {import('tailwindcss').Config} */
function themeColor(name) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

export default {
  darkMode: 'class',
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: themeColor('canvas'),
        subtle: themeColor('subtle'),
        surface: themeColor('surface'),
        elevated: themeColor('elevated'),
        line: themeColor('line'),
        'line-strong': themeColor('line-strong'),
        ink: themeColor('ink'),
        muted: themeColor('muted'),
        faint: themeColor('faint'),
        accent: {
          DEFAULT: themeColor('accent'),
          hover: themeColor('accent-hover'),
          soft: themeColor('accent-soft'),
        },
        success: { DEFAULT: themeColor('success'), soft: themeColor('success-soft') },
        warning: { DEFAULT: themeColor('warning'), soft: themeColor('warning-soft') },
        danger: { DEFAULT: themeColor('danger'), soft: themeColor('danger-soft') },
        info: { DEFAULT: themeColor('info'), soft: themeColor('info-soft') },
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
        pop: 'var(--shadow-pop)',
      },
    },
  },
  plugins: [],
}
