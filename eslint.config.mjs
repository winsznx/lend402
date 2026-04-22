import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  {
    ignores: [
      ".next/**/*",
      "node_modules/**/*",
      "dist/**/*",
      "coverage/**/*",
      "tmp/**/*"
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
];

export default eslintConfig;
