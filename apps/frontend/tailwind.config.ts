import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb, 59 174 93) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark-rgb, 31 122 62) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light-rgb, 167 215 181) / <alpha-value>)',
        },
        accent: {
          yellow: 'rgb(var(--color-accent-yellow-rgb, 244 197 66) / <alpha-value>)',
          red: 'rgb(var(--color-accent-red-rgb, 228 106 93) / <alpha-value>)',
        },
        surface: {
          beige: 'rgb(var(--color-surface-beige-rgb, 242 237 228) / <alpha-value>)',
          offwhite: 'rgb(var(--color-surface-offwhite-rgb, 247 247 242) / <alpha-value>)',
          white: 'rgb(var(--color-surface-white-rgb, 255 255 255) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary-rgb, 46 46 46) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb, 105 114 125) / <alpha-value>)',
          light: 'rgb(var(--color-text-light-rgb, 255 255 255) / <alpha-value>)',
          green: 'rgb(var(--color-text-green-rgb, 31 122 62) / <alpha-value>)',
        }
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
      },
      fontWeight: {
        heading: 'var(--font-heading-weight, 900)',
        body: 'var(--font-body-weight, 400)',
      },
      fontSize: {
        'hero': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],
        'title': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        'subtitle': ['1.75rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        'button': 'var(--radius-button, 999px)',
        'card': 'var(--radius-card, 16px)',
        'cluster': 'var(--radius-cluster, 50%)',
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
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
