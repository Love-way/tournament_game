import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#FF6B00',
          600: '#E05D00',
          400: '#FF8C33',
        },
        gold: '#FFD700',
        dark: '#0A0A0A',
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'cursive'],
        orbitron: ['Orbitron', 'monospace'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
