import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tsParser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const tsFiles = ['**/*.{ts,tsx,mts,cts}'];
const testFiles = ['**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'];

export default [
  {
    ignores: ['**/build/**', '**/.turbo/**', '**/node_modules/**'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx', '.mts', '.cts'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['packages/*/tsconfig.json'],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.mts', '.cts'],
        },
      },
      'import/core-modules': ['electron'],
    },
    rules: {
      'import/extensions': ['error', 'never'],
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      'arrow-parens': ['error', 'as-needed'],
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'assert'] }],
      'no-nested-ternary': 'off',
      'import/no-unresolved': [2, { ignore: ['.png?inline'] }],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error'],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error'],
    },
  },
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        project: ['packages/*/tsconfig.json'],
        tsconfigRootDir: rootDir,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: testFiles,
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];
