/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tvk: {
          dark: '#7f1d1d',       // Deep Crimson
          primary: '#991b1b',    // TVK Primary Crimson
          hover: '#b91c1c',      // Bright Red Hover
          light: '#fef2f2',      // Very Light Red Tint
          border: '#fecaca',     // Soft Red Border
          gold: '#eab308',       // Accent Gold
          goldDark: '#ca8a04',   // Dark Gold
          goldLight: '#fef9c3',  // Light Gold Tint
        },
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -3px rgba(153, 27, 27, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
