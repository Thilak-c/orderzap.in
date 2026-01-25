/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        luxury: ['var(--font-bodoni)', 'Bodoni Moda', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#d4af7d',
          light: '#e8c99b',
          dark: '#b8956a',
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'glow': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
