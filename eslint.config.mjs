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
    // tech-spec §4: không điểm cuối nào được tự phân giải thẩm quyền bằng cách
    // so sánh vai. Mọi quyết định phải đi qua matrix.ts (SPEC-006).
    // Điểm cuối tự phân giải thẩm quyền, và giao diện tự đoán vai, là cùng một
    // lỗi ở hai tầng — nên luật phủ toàn bộ `src`. Chỉ `src/domain/permissions`
    // được miễn: đó là nơi duy nhất định nghĩa vai nghĩa là gì.
    // Muốn suy ra điều gì từ vai ở nơi khác thì tra `MATRIX[role][...]`, đừng so
    // sánh chuỗi vai — tra ma trận thì thêm vai mới là tự đúng theo.
    files: ["src/**/*.{js,ts,tsx}"],
    ignores: ["src/domain/permissions/**", "src/generated/**", "**/*.test.{js,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // user.role === "ADMIN" / actor.role !== "AFFILIATE"
          selector:
            "BinaryExpression[operator=/^[!=]==$/][left.property.name='role'][right.type='Literal']",
          message:
            "Điểm cuối không được so sánh trực tiếp vai. Dùng hasPermission / assertPermission / canAccessRequest (tech-spec §4, SPEC-006).",
        },
        {
          // "ADMIN" === user.role — dạng đảo vế
          selector:
            "BinaryExpression[operator=/^[!=]==$/][right.property.name='role'][left.type='Literal']",
          message:
            "Điểm cuối không được so sánh trực tiếp vai. Dùng hasPermission / assertPermission / canAccessRequest (tech-spec §4, SPEC-006).",
        },
        {
          selector:
            "MemberExpression[property.name=/^(isAdmin|isAffiliate|isBuyer)$/]",
          message:
            "Không được dựa vào cờ vai (isAdmin/isAffiliate/isBuyer). Dùng hasPermission với định danh thẩm quyền tương ứng (tech-spec §4, SPEC-006).",
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
