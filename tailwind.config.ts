import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
  ],
  safelist: [
    'from-pink-500',
    'from-blue-500',
    'from-green-400',
    'from-orange-400',
    'via-purple-500',
    'via-red-500',
    'via-cyan-500',
    'to-orange-400',
    'to-pink-500',
    'to-blue-500',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
