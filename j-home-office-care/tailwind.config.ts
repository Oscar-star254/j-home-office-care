import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#0f3d1e', 50: '#f1f7f2', 100: '#dcebdf', 200: '#b9d6c0', 300: '#8ab99a', 400: '#4f8f64', 500: '#2a6b3f', 600: '#1a5430', 700: '#0f3d1e', 800: '#0a2d16', 900: '#061c0e' },
        gold: { DEFAULT: '#d4a017', 50: '#fdf8e8', 100: '#faefc4', 200: '#f4de8a', 300: '#ecc84f', 400: '#e0b22a', 500: '#d4a017', 600: '#b07f10', 700: '#8a600f' },
        cream: '#fbfaf5',
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'sans-serif'],
        body: ['Poppins', 'system-ui', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      },
      boxShadow: { card: '0 8px 30px rgba(15,61,30,0.10)' },
    },
  },
  plugins: [],
};
export default config;
