/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'Arial', 'sans-serif']
      },
      colors: {
        ink: '#050505',
        linen: '#f7f5f2',
        clay: '#77716d',
        moss: '#323634',
        champagne: '#ded9d2'
      },
      boxShadow: {
        glow: '0 18px 60px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};
