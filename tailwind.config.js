/** @type {import('tailwindcss').Config} */
const { hairlineWidth } = require('nativewind/theme'); // Import if you use hairlineWidth

module.exports = {
  presets: [require('nativewind/preset')],

  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // Example of adding hairlineWidth if needed, adjust as necessary
      // borderWidth: {
      //   hairline: hairlineWidth(),
      // },
    },
  },
  plugins: [],
  // Add this for NativeWind v4 if postcss.config.js output isn't working
  nativewind: {
    output: "nativewind-output.js",
    // input: "global.css", // Optional: if you have a global css file other than tailwind.css
  },
}; 