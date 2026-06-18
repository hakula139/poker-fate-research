import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const importSortGroups = [
  ['^\\u0000'],
  ['^node:'],
  ['^@?\\w'],
  ['^@/'],
  ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
  ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
  ['^.+\\.s?css$'],
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/data/**', 'test-results/**', '*.tsbuildinfo'],
  },
  {
    files: ['*.config.js', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['*.config.ts', 'playwright.config.ts', 'vite.config.ts'],
    languageOptions: {
      globals: {
        ...globals.es2025,
        ...globals.node,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2025,
        ...globals.worker,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['badgeVariants', 'buttonVariants', 'useI18n'],
        },
      ],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': ['error', { groups: importSortGroups }],
    },
  },
  {
    files: ['worker/**/*.ts'],
    ignores: ['worker/**/*.test.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2025,
        ...globals.worker,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': ['error', { groups: importSortGroups }],
    },
  },
  {
    files: [
      'src/**/*.test.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
      'worker/**/*.test.ts',
      '*.config.ts',
      'playwright.config.ts',
      'vite.config.ts',
    ],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2025,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': ['error', { groups: importSortGroups }],
    },
  },
  eslintConfigPrettier,
);
