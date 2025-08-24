/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        crediyaBlue: "#2176FF",
        crediyaGreen: "#7EFF3C",
        crediyaYellow: "#F5F506",
        crediyaDark: "#0B0B0B",
        crediyaWhite: "#ffffff",
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}