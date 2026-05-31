/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
      extend: {
        fontFamily: {
          mono: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
        },
        colors: {
          // Tactical HUD palette
          hud: {
            black:   '#000000',
            surface: '#030603',
            panel:   '#060906',
            border:  '#0d1a0d',
            border2: '#162416',
            green:   '#00ff41',
            'green-dim': '#00c832',
            'green-muted': '#1a4a1a',
            'green-text': '#4aff6a',
            red:     '#ff3b3b',
            'red-dim':'#992222',
            amber:   '#ffaa00',
            cyan:    '#00e5ff',
            white:   '#e8e8e8',
            gray:    '#666666',
            'gray-dim': '#333333',
          },
        },
        animation: {
          'pulse-green': 'pulseGreen 2s ease-in-out infinite',
          'scan': 'scan 4s linear infinite',
          'blink': 'blink 1.2s step-end infinite',
          'flicker': 'flicker 0.15s ease-in-out infinite',
        },
        keyframes: {
          pulseGreen: {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
          scan: {
            '0%': { transform: 'translateY(-100%)' },
            '100%': { transform: 'translateY(100vh)' },
          },
          blink: {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0 },
          },
          flicker: {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.95 },
          },
        },
      },
    },
    plugins: [require('tailwindcss-animate')],
  };