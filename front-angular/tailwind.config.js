/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Teintes assombries pour un contraste d'au moins 4,5:1 (WCAG 1.4.3).
        emerald: { 600: '#047857', 700: '#065f46' },
        cyan: { 600: '#0e7490', 700: '#155e75' },
        green: { 600: '#15803d', 700: '#166534' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
