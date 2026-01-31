/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./ui/**/*.{js,ts,jsx,tsx}",
    "./registry/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			sm: '0.125rem'
  		},
  		fontFamily: {
  			jetbrains: [
  				'JetBrains Mono',
  				'monospace'
  			],
  			geist: [
  				'geist',
  				'monospace'
  			],
  			gtamerica: [
  				'gtamerica',
  				'monospace'
  			],
  			revxneue: [
  				'revxneue',
  				'monospace'
  			],
  			vivala: [
  				'vivala',
  				'monospace'
  			],
  			scifi: [
  				'scifi',
  				'monospace'
  			],
  			mechano: [
  				'mechano',
  				'monospace'
  			],
  			proto: [
  				'proto',
  				'monospace'
  			]
  		},
  		colors: {
  			liquirice: '#040A0C',
  			flash: '#d7d8d9',
  			pine: '#148460',
  			cement: '#0f1213',
  			jade: '#00d992',
  			error: '#ff6286',
  			citrine: '#FFB615'
  		},
  		animation: {
  			pulseGlow: 'pulseGlow 10s ease-in-out infinite',
  			glow: 'glowPulse 3s ease-in-out infinite',
  			glitch: 'glitch 1s infinite',
  			'rotate-outline': 'rotateOutline 2s linear infinite',
  			jerk: 'jerk 0.5s infinite',
  			'glitch-jerk': 'glitch 1s infinite, jerk 0.5s infinite',
  			blink: 'blink 1s steps(2, start) infinite',
  			'border-spin': 'border-spin 7s linear infinite',
  			'pulse-slow': 'pulseSlow 8s ease-in-out infinite',
  			'open-vertical': 'open-vertical 50ms ease-in-out forwards',
  			'close-vertical': 'close-vertical 50ms ease-in-out forwards',
  			'glitch-open': 'glitch-open 200ms ease-out forwards',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		keyframes: {
  			'border-spin': {
  				'100%': {
  					transform: 'rotate(-360deg)'
  				}
  			},
  			pulseGlow: {
  				'0%, 100%': {
  					transform: 'scale(1)',
  					opacity: '0.7'
  				},
  				'50%': {
  					transform: 'scale(1.15)',
  					opacity: '0'
  				}
  			},
  			glitch: {
  				'0%': {
  					transform: 'translate(0)'
  				},
  				'20%': {
  					transform: 'translate(-2px, 2px)'
  				},
  				'40%': {
  					transform: 'translate(-2px, -2px)'
  				},
  				'60%': {
  					transform: 'translate(2px, 2px)'
  				},
  				'80%': {
  					transform: 'translate(2px, -2px)'
  				},
  				'100%': {
  					transform: 'translate(0)'
  				}
  			},
  			jerk: {
  				'0%, 100%': {
  					transform: 'skew(0deg)'
  				},
  				'25%': {
  					transform: 'skew(-1deg)'
  				},
  				'50%': {
  					transform: 'skew(1.5deg)'
  				},
  				'75%': {
  					transform: 'skew(-0.5deg)'
  				}
  			},
  			pulseSlow: {
  				'0%, 100%': {
  					opacity: '0.05'
  				},
  				'50%': {
  					opacity: '0.15'
  				}
  			},
  			blink: {
  				'0%, 100%': {
  					opacity: 1
  				},
  				'50%': {
  					opacity: 0
  				}
  			},
  			glowPulse: {
  				'0%, 100%': {
  					backgroundSize: '200% 200%',
  					backgroundPosition: 'left center',
  					filter: 'brightness(1)'
  				},
  				'50%': {
  					backgroundSize: '200% 200%',
  					backgroundPosition: 'right center',
  					filter: 'brightness(1.3)'
  				}
  			},
  			'open-vertical': {
  				'0%': {
  					transform: 'scaleY(0)'
  				},
  				'100%': {
  					transform: 'scaleY(1)'
  				}
  			},
  			'close-vertical': {
  				'0%': {
  					transform: 'scaleY(1)'
  				},
  				'100%': {
  					transform: 'scaleY(0)'
  				}
  			},
  			'glitch-open': {
  				'0%': {
  					opacity: 0,
  					transform: 'scaleY(0.8) skew(2deg, 2deg) translateY(-10px)',
  					filter: 'brightness(0.5) contrast(2)'
  				},
  				'50%': {
  					opacity: 1,
  					transform: 'scaleY(1.05) skew(-1deg, -1deg) translateY(2px)',
  					filter: 'brightness(1.1) contrast(1.5)'
  				},
  				'100%': {
  					opacity: 1,
  					transform: 'scaleY(1) skew(0deg, 0deg) translateY(0)',
  					filter: 'none'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		opacity: {
  			'2': '0.02'
  		},
  		cursor: {
  			clicker: 'url("/cursors/clicker.svg") 16 6, auto',
  			pointer: 'url("/cursors/base.svg") 8 8, auto'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require('tailwind-scrollbar-hide'),
  ],
}
