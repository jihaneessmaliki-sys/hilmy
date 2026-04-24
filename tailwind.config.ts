import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vert: {
          DEFAULT: '#0F3D2E',
          dark: '#092417',
        },
        or: {
          DEFAULT: '#C9A961',
          light: '#E5D4AF',
        },
        creme: {
          DEFAULT: '#F5F0E6',
          deep: '#EEE6D8',
        },
        blanc: '#FDFBF7',
        texte: {
          DEFAULT: '#1A1A1A',
          sec: '#6B6B6B',
        },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(3rem, 7vw, 5.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        h1: ['clamp(2.25rem, 4.5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        h2: ['clamp(1.875rem, 3vw, 2.75rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        lead: ['1rem', { lineHeight: '1.6' }],
        overline: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.28em' }],
      },
      maxWidth: {
        container: '1200px',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  plugins: [],
}

export default config
