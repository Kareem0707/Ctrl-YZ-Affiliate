/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F9FA',
        card: '#FFFFFF',
        border: '#E4E4E7',
        ink: {
          DEFAULT: '#030303',
          muted: '#71717A',
          subtle: '#A1A1AA',
        },
        brand: {
          DEFAULT: '#0258ED',
          hover: '#0047C4',
          subtle: '#EFF6FF',
          border: '#BFDBFE',
          cyan: '#0084FF',
          dark: '#013DB3',
        },
        financial: {
          DEFAULT: '#059669',
          hover: '#047857',
          subtle: '#ECFDF5',
          border: '#A7F3D0',
        },
        primary: {
          DEFAULT: '#0258ED',
          dark: '#0047C4',
          light: '#EFF6FF',
        },
      },
      fontFamily: {
        arabic: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans Arabic"', 'Inter', 'system-ui', 'sans-serif'],
        num: ['"Plus Jakarta Sans"', 'Inter', 'monospace'],
        mono: ['"Plus Jakarta Sans"', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        elevated: '0 4px 16px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
