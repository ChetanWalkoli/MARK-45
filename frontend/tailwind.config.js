/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '400px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        dark: {
          bg:      '#050505',
          surface: '#0A0A0C',
          border:  'rgba(0, 207, 255, 0.1)',
        },
        brand: {
          cyan: '#00CFFF',
          gold: '#FFB347',
        },
      },
      fontFamily: {
        sans:    ['"Inter"',         'sans-serif'],
        mono:    ['"JetBrains Mono"','monospace'],
        display: ['"Orbitron"',      'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '18':  '4.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      minHeight: {
        '11': '2.75rem',
      },
    },
  },
  plugins: [],
}
