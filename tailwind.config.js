/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007AFF',
          dark: '#0055B3',
          light: '#4DA3FF'
        },
        secondary: {
          DEFAULT: '#5856D6',
          dark: '#3634A3',
          light: '#7A79E0'
        },
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        background: '#F2F2F7',
        card: '#FFFFFF'
      }
    }
  },
  plugins: []
} 