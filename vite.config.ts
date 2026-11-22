import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages 프로젝트 페이지: https://<user>.github.io/fc/
  base: '/fc/',
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
