/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        sm: '0.125rem',
      },
      fontFamily: {
        'jetbrains': ['JetBrains Mono', 'monospace'],
        'geist': ['geist', 'monospace'],
        'gtamerica': ['gtamerica', 'monospace'],
        'revxneue': ['revxneue', 'monospace'],
        'vivala': ['vivala', 'monospace']
      },
      colors: {
        liquirice: '#040A0C',
        flash: '#d7d8d9',
        jade: '#00d992',
        error: '#ff6286',
        citrine: '#FFB615',
      },
      animation: {
        glow: 'glowPulse 3s ease-in-out infinite',
        glitch: 'glitch 1s infinite',
         jerk: 'jerk 0.5s infinite',
        'glitch-jerk': 'glitch 1s infinite, jerk 0.5s infinite',
        blink: 'blink 1sd steps/2, start) infinite',
        'pulse-slow': 'pulseSlow 8s ease-in-out infinite',
      },
      opacity: {
        '2': '0.02'
      },
      keyframes: {
         glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        jerk: {
          '0%, 100%': { transform: 'skew(0deg)' },
          '25%': { transform: 'skew(-1deg)' },
          '50%': { transform: 'skew(1.5deg)' },
          '75%': { transform: 'skew(-0.5deg)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.05' },
          '50%': { opacity: '0.15' },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        glowPulse: {
          '0%, 100%': {
            backgroundSize: '200% 200%',
            backgroundPosition: 'left center',
            filter: 'brightness(1)',
          },
          '50%': {
            backgroundSize: '200% 200%',
            backgroundPosition: 'right center',
            filter: 'brightness(1.3)',
          },
        },
      },
    },
    cursor: {
      clicker: 'url("/cursors/clicker.svg") 16 6, auto',
      pointer: 'url("cursors/base.svg") 8 8, auto',
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('tailwind-scrollbar-hide'),
  ],
}
