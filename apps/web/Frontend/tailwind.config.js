/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navbar: '#145C41',
        navActive: '#04855A',
        navMuted: '#73DAA8',
        ring: '#93F6CA',
        pageBg: '#F4FAF7',
        cardBg: '#E5F9EF',
        primary: '#1C8F63',
        dark: '#006A46',
        deep: '#0E3B29',
        soft: '#5CBE96',
        footerBg: '#A3DDC0',
        textPrimary: '#161717',
        textSecondary: '#3E4942',
        textMuted: '#6E7A72',
        surfaceGray: '#E9E8E7',
        selectBg: '#F5F3F3',
        track: '#E3E2E2',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      maxWidth: {
        content: '1280px',
      },
      padding: {
        main: '88px 32px 24px',
      },
      borderRadius: {
        chip: '4px',
        control: '8px',
        panel: '12px',
        card: '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.05)',
        nav: '0 2px 10px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
