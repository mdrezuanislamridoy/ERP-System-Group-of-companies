export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: '#f3f4f6',
        surface: '#ffffff',
        rail: '#fafbfc',
        line: '#e3e6eb',
        'line-strong': '#c9d0d9',
        ink: '#0f151d',
        muted: '#57616e',
        faint: '#8b95a2',
        accent: '#1d4ed8',
        'accent-soft': '#eef2ff',
        warn: '#9a5b00',
        'warn-soft': '#fdf5e8',
        ok: '#0d6b4f',
        'ok-soft': '#eaf6f1',
        danger: '#b02a22',
        'danger-soft': '#fdeded',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
      maxWidth: {
        prose: '78ch',
      },
    },
  },
}
