/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette "scandinave / Volvo" : bleus-gris profonds + accent.
        brand: {
          50: '#eef4fb',
          100: '#d8e6f5',
          200: '#b5cdea',
          300: '#86acda',
          400: '#5685c6',
          500: '#3667ad',
          600: '#2a4f8f',
          700: '#243f72',
          800: '#22375f',
          900: '#1c2a3a',
          950: '#0f1620',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
