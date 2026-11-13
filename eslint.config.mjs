import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  { ignores: ['dist/', 'dist-public/', 'dist-sub/', 'dist-hours/', 'dist-inquiry/', 'dist-menu/', 'dist-update/', '.astro/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  { files: ['scripts/**', 'integrations/**'], rules: { 'no-console': 'off' } },
);
