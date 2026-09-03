/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        recoup: {
          dark: '#0B0F17',
          card: '#131A29',
          border: '#1E293B',
          accent: '#00D2FF',
          accentGlow: '#00E5FF22',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          purple: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
};
