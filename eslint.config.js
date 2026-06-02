import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'supabase/functions']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // react-hooks v7's newest rules are advisory and over-fire on correct
      // effect patterns (timers, URL/param reads, external sync). Keep them
      // visible as warnings; real correctness rules stay as errors and gate CI.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      // Fast-Refresh granularity hint (dev-only HMR); fires on shadcn variant
      // exports and co-located helpers. Not a correctness concern.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
