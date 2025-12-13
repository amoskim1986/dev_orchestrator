/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./terminal.html",
    "./project-detail.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
