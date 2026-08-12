import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint rules that conflict with Prettier formatting.
  // Must be last so it overrides earlier configs.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client
    "src/generated/**",
  ]),
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/domain",
              from: "./src/app",
              message: "Domain code must not import from UI (app).",
            },
            {
              target: "./src/domain",
              from: "./src/components",
              message: "Domain code must not import from UI (components).",
            },
            {
              target: "./src/domain",
              from: "./src/lib",
              message: "Domain code must not import from infra (lib).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.{js,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next", "next/*"],
              message: "Domain code must not depend on UI frameworks.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
