/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app:    '#0C0C0C',
        card:   '#141414',
        border: '#242424',
        accent: '#6C3EF4',
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
        mono:  ['DM Mono', 'monospace'],
      },
    }
  },
  plugins: []
};
