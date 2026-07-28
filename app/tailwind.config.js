/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#dce9ff',
          200: '#b9d2ff',
          300: '#8bb4fd',
          400: '#5f97fa',
          500: '#3B82F6',
          600: '#0049B7',
          700: '#003a92',
          800: '#002c70',
          900: '#001f4d',
          950: '#00132e',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#0B1220',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#111C33',
        },
      },
    },
  },
  plugins: [],
};
