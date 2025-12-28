/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary - Màu may mắn
        primary: {
          red: '#C41E3A',
          'red-dark': '#8B0000',
          'red-light': '#E63946',
        },
        // Secondary - Vàng kim
        secondary: {
          gold: '#FFD700',
          'gold-dark': '#DAA520',
          'gold-light': '#FFF8DC',
        },
        // Accent - Màu phụ
        accent: {
          jade: '#00A86B',
          brown: '#8B4513',
          cream: '#FFF8DC',
        },
      },
      fontFamily: {
        heading: ['UTM-Avo'],
        body: ['SVN-Gilroy'],
        decorative: ['UTM-Cookies'],
      },
    },
  },
  plugins: [],
};
