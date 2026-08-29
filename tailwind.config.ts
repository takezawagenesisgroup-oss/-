import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f0',
          100: '#d7ecd9',
          200: '#aed8b3',
          300: '#82c28a',
          400: '#5aab65',
          500: '#3d8f48',
          600: '#2f7239',
          700: '#26592d',
          800: '#1f4724',
          900: '#193a1e',
        },
      },
      fontSize: {
        base: ['18px', '1.6'],
        lg: ['22px', '1.6'],
        xl: ['26px', '1.5'],
        '2xl': ['32px', '1.4'],
        '3xl': ['40px', '1.3'],
      },
    },
  },
  plugins: [],
};
export default config;
