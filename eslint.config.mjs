// @ts-check
// Flat config. Named .mjs because package.json has no "type": "module".
// `@eslint/js` is an explicit devDependency: ESLint 10 no longer bundles it,
// so it must be installed to get the old `eslint:recommended` layer.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import tsdoc from 'eslint-plugin-tsdoc'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'coverage/',
      'test-results/',
      'examples/',
      'temp/',
      '.serena/',
      '.remember/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // includes eslint-config-prettier + plugin:prettier/recommended
  prettierRecommended,
  {
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: { tsdoc },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'tsdoc/syntax': 'warn',
    },
  },
  // root scripts (post-build.js) are CommonJS
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    // `require()` is the point of a CJS script (was no-var-requires in v6)
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // renderer + preload run in a browser context
  {
    files: ['src/ProgressWindow/renderer.ts', 'src/ProgressWindow/preload.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'e2e/**/*.ts', 'test/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
)
