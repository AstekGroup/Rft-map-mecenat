import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs du design system La Grande Semaine Végétale
        primary: {
          DEFAULT: '#3BAE5D', // green_main
          dark: '#1F7A3E',    // green_dark
          light: '#A7D7B5',   // green_light
        },
        accent: {
          yellow: '#F4C542',
          red: '#E46A5D',
        },
        surface: {
          beige: '#F2EDE4',
          offwhite: '#F7F7F2',
          white: '#ffffff',
        },
        text: {
          primary: '#2E2E2E',
          secondary: '#69727d',
          light: '#ffffff',
          green: '#1F7A3E',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'title': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        'subtitle': ['1.75rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        'button': '999px', // Rounded pill shape from LGSV design
        'card': '16px',
        'cluster': '50%',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'popup': '0 10px 25px -5px rgba(31, 122, 62, 0.2)',
        'cluster': '0 2px 10px rgba(59, 174, 93, 0.4)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
