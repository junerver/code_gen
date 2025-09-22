/**
 * @Description Vitest测试配置
 * @Author Qoder AI
 * @Date 2025-09-22
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: {
      '#shared': resolve(__dirname, './shared'),
      '#server': resolve(__dirname, './server'),
      '~': resolve(__dirname, './app'),
    },
  },
});
