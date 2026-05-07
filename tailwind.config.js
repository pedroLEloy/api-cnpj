/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0a1628',
          soft: '#1f2a3d',
          muted: '#5a6478',
        },
        paper: {
          DEFAULT: '#faf8f5',
          warm: '#f4f0e9',
          line: '#e7e1d6',
        },
        accent: {
          DEFAULT: '#b4541c',
          hover: '#8f4216',
        },
        signal: {
          ok: '#1e6a3e',
          warn: '#a35d00',
          err: '#a01c1c',
        },
      },
    },
  },
  plugins: [],
};
