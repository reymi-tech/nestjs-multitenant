import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: eslint.configs.recommended,
  allConfig: eslint.configs.all,
});

export default [
  // Configuraciones base
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs.recommended,

  // Configuraciones legacy usando compat
  ...fixupConfigRules(
    compat.extends('plugin:prettier/recommended', 'plugin:node/recommended'),
  ),

  // Configuración principal para archivos TypeScript
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: tsParser,
      parserOptions: {
        // Solucionando el error del project service
        project: ['./tsconfig.build.json'],
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        NodeJS: true,
      },
    },
    rules: {
      // Reglas de simple-import-sort
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js built-in modules
            [
              '^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|freelist|v8|process|async_hooks|http2|perf_hooks)(/.*|$)',
            ],
            // Side effect imports
            [
              String.raw`^node:.*\u0000$`,
              String.raw`^@?\w.*\u0000$`,
              String.raw`^[^.].*\u0000$`,
              String.raw`^\..*\u0000$`,
            ],
            [String.raw`^\u0000`],
            // Node: protocol imports
            ['^node:'],
            // External packages
            [String.raw`^@?\w`],
            // Internal packages - usando tus paths del tsconfig

            // Other imports
            ['^'],
            // Relative imports
            [String.raw`^\.`],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // Reglas de unicorn
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': 'off',

      // Otras reglas
      'no-console': 'warn',
      'node/no-missing-import': 'off',
      'node/no-unsupported-features/es-syntax': [
        'error',
        { ignores: ['modules'] },
      ],
      'node/no-unpublished-import': 'off',
      'no-process-exit': 'off',
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },

  // Configuración específica para archivos de configuración (eslint.config.mjs)
  {
    files: ['eslint.config.mjs', '*.config.{js,mjs,cjs}'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Deshabilitar reglas problemáticas para archivos de configuración
      'node/no-unpublished-import': 'off',
      'node/no-missing-import': 'off',
      'no-console': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Configuración para archivos de test
  {
    files: ['tests/**/*.{ts,js}', '**/*.spec.ts', '**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'unicorn/no-useless-undefined': ['error', { checkArguments: false }],
    },
  },

  // Prettier debe ir al final para sobrescribir conflictos de formato
  eslintConfigPrettier,

  // Ignorar archivos
  {
    ignores: [
      'node_modules/*',
      'dist/*',
      'coverage/*',
      'documentation/*',
      'pnpm-lock.yaml',
      '.gitignore',
      '*.log',
    ],
  },
];
