/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "metabase-bg": "#F9FBFE",
        "metabase-header": "#22242B",
        "metabase-subheader": "#5A6072",
        "metabase-blue": "#509EE3",
        "metabase-blue-hover": "#6BA8E8",
      },
    },
  },
  plugins: [],
};
