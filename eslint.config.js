import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },

  js.configs.recommended,

  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  {
    files: ['*.js'],
    languageOptions: { globals: globals.node },
  },

  // 아키텍처 규칙 1, 4: 시뮬레이션은 순수 TS, 시드 RNG만 사용
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*'],
              message: 'src/sim/은 Phaser를 import할 수 없습니다 (CLAUDE.md 규칙 1).',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: '시뮬레이션에서는 sim/rng.ts의 시드 RNG를 쓰세요 (CLAUDE.md 규칙 4).',
        },
      ],
    },
  },

  prettier,
);
