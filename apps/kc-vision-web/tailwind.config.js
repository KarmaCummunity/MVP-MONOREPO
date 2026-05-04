/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kc: {
          primary: '#0d9488',
          primaryDark: '#0f766e',
          accent: '#f59e0b',
          surface: '#f8fafc',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
}
