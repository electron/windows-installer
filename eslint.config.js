import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import avaPlugin from 'eslint-plugin-ava';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // avaPlugin.configs.recommended,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        global: 'readonly',
      },
    },
    rules: {
      'strict': 0,
      'indent': [2, 2],
      '@typescript-eslint/no-var-requires': 'off',
      'semi': [2, 'always'],
      'no-console': 0,
      'quotes': [2, 'single', 'avoid-escape'],
    },
  }
);