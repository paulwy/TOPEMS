/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0288D1',
          700: '#0277BD',
          800: '#0369a1',
          900: '#075985',
        }
      },
      animation: {
        'typing': 'typing 1.4s infinite ease-in-out both',
      },
      keyframes: {
        typing: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
