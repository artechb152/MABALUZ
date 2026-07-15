/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App shell: cool light-grey monochrome + one indigo accent.
        // (Replaces the old warm cream, which fought the indigo.)
        background: '#EFF1F6', // cool light grey canvas, faint blue tilt
        panel: 'rgba(255,255,255,0.75)', // frosted white chrome (navbar/sidebar)
        'panel-solid': '#FFFFFF',
        primary: {
          DEFAULT: '#4F46E5', // indigo accent
          soft: '#E9E7FC', // light indigo (allowed soft fill)
          hover: '#3F37C9'
        },
        line: '#DCDFE7', // cool hairline border
        ink: {
          DEFAULT: '#22262F', // cool near-black
          muted: '#474C57' // cool graphite
        },
        // Status = three rich colors, used as thin accents (border/text/icon).
        // The `-soft` tints are whisper-faint (6% alpha) so status callouts read
        // as tinted cream, never a saturated fill — blocks stay the only vivid color.
        danger: {
          DEFAULT: '#C81D4B',
          soft: 'rgba(200,29,75,0.06)'
        },
        warning: {
          DEFAULT: '#CC4800',
          soft: 'rgba(204,72,0,0.06)'
        },
        success: {
          DEFAULT: '#0F766E',
          soft: 'rgba(15,118,110,0.07)'
        },
        graphite: '#474C57',
        stone: '#C2C7D2',
        'neutral-block': '#E6E9F0'
      },
      fontFamily: {
        // Four fixed tiers across the whole app.
        sans: ['Assistant', '"Segoe UI"', 'Arial', 'sans-serif'],
        display: ['Heebo', 'Assistant', 'Arial', 'sans-serif'],
        brand: ['"Cherry Bomb One"', 'Heebo', 'sans-serif']
      },
      fontSize: {
        detail: ['14px', { lineHeight: '1.4' }],
        body: ['16px', { lineHeight: '1.5' }],
        subhead: ['20px', { lineHeight: '1.4' }],
        display: ['26px', { lineHeight: '1.25' }]
      },
      boxShadow: {
        card: '0 1px 2px rgba(37, 36, 34, 0.05), 0 6px 20px rgba(37, 36, 34, 0.05)',
        'card-hover': '0 2px 4px rgba(37, 36, 34, 0.07), 0 10px 28px rgba(37, 36, 34, 0.09)',
        pop: '0 12px 40px rgba(37, 36, 34, 0.16)',
        lift: '0 10px 22px rgba(37, 36, 34, 0.18)'
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
}
