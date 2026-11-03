import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // src/api is read-only (see AGENTS.md), so it is not ours to lint.
  { ignores: ["dist", "coverage", "playwright-report", "test-results", "src/api"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["src/**/*.tsx"],
    extends: [
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
  },
  {
    // e2e tests need the pinned clock and time zone from e2e/test.ts.
    files: ["e2e/**/*.ts"],
    ignores: ["e2e/test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "@playwright/test", message: "Import test and expect from ./test instead." }] },
      ],
    },
  },
  { files: ["**/*.js"], extends: [js.configs.recommended], languageOptions: { globals: globals.node } },
  prettier,
);
