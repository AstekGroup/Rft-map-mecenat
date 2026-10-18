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
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light-rgb) / <alpha-value>)',
        },
        accent: {
          yellow: 'rgb(var(--color-accent-yellow-rgb) / <alpha-value>)',
          red: 'rgb(var(--color-accent-red-rgb) / <alpha-value>)',
        },
        surface: {
          beige: 'rgb(var(--color-surface-beige-rgb) / <alpha-value>)',
          offwhite: 'rgb(var(--color-surface-offwhite-rgb) / <alpha-value>)',
          white: 'rgb(var(--color-surface-white-rgb) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
          light: 'rgb(var(--color-text-light-rgb) / <alpha-value>)',
          green: 'rgb(var(--color-text-green-rgb) / <alpha-value>)',
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
        'popup': '0 10px 25px -5px rgb(var(--color-primary-dark-rgb) / 0.2)',
        'cluster': '0 2px 10px rgb(var(--color-primary-rgb) / 0.4)',
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
