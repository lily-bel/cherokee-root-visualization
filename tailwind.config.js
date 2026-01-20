module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: { 
    extend: {
      fontFamily: {
        'cherokee': ['"Noto Sans Cherokee"', 'sans-serif'],
        'serif': ['"Noto Serif"', 'serif'],
        'sans': ['"Inter"', 'sans-serif'],
      }
    } 
  },
  plugins: [],
}