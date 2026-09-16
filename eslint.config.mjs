import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import ava from "eslint-plugin-ava";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["docs/", "lib/", "vendor/"],
  },
  ...ava.configs.recommended,
  {
    files: ["src/**/*.ts", "spec/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "no-console": "off",
      "@stylistic/indent": ["error", 2],
      "@stylistic/quotes": ["error", "single", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
    },
  },
);
