/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecf7ef',
          100: '#d4ecdb',
          200: '#a9d8b8',
          300: '#86c99b',
          400: '#4caf6e',
          500: '#2e8b57',
          600: '#166534',
          700: '#14532d',
          800: '#0f4024',
          900: '#0a2e1a',
          950: '#05190e',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#0a1410',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#112019',
        },
      },
    },
  },
  plugins: [],
};
