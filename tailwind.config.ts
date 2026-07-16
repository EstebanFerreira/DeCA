import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        deca: {
          teal: '#1a7a7a',
          tealLight: '#3fa9a0',
          gold: '#b8860b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
