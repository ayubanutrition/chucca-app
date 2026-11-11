import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __CHUCCA_MODE__: JSON.stringify('preview'), __CHUCCA_BUILD_ID__: JSON.stringify('test') },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
