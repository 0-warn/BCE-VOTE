/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Indian tricolor palette + navy accent (from the plan).
      colors: {
        saffron: "#FF9933",
        indiagreen: "#138808",
        navy: "#000080",
      },
    },
  },
  plugins: [],
};