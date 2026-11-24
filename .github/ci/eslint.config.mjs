// Initial correctness-focused lint baseline. Formatting is intentionally excluded.
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**", "**/old-implementation-reference/**"] },
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: { parser: tseslint.parser },
    rules: {
      "no-debugger": "error",
      "no-dupe-args": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-sparse-arrays": "error",
      "no-constant-binary-expression": "error",
      "no-fallthrough": "error",
    },
  },
];
