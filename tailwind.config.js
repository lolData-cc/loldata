/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily:{
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        liquirice: '#040A0C',
        flash: '#d7d8d9',
        jade: '#00d992',
        error: '#ff6286'
      },
      animation: {
        glow: 'glowPulse 3s ease-in-out infinite',
      },
        opacity: {
  			'2': '0.02'
  		},
      keyframes: {
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
  },
  plugins: [require("tailwindcss-animate")],
}
