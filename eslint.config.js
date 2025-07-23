import stylistic from "@stylistic/eslint-plugin"
import tseslint from "typescript-eslint"

export default tseslint.config (
  {
    ignores: [
      "node_modules/**/*",
      "dist/**/*"
    ]
  },
  {
    plugins: {
      "@stylistic": stylistic
    },
    files: [
      "src/**/*.ts"
    ],
    extends: [
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      sourceType: "module",
      parserOptions: {
        projectService: true,
        createDefaultProgram: true
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": [
            "classProperty",
            "typeProperty",
            "classMethod",
            "objectLiteralMethod",
            "typeMethod",
            "accessor",
            "enumMember"
          ],
          "format": [
            "camelCase",
            "PascalCase"
          ]
        }
      ],
      "@stylistic/member-ordering": "off",
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          "accessibility": "explicit"
        }
      ],
      "@stylistic/member-delimiter-style": [
        "error",
        {
          "multiline": {
            "delimiter": "none",
            "requireLast": true
          },
          "singleline": {
            "delimiter": "semi",
            "requireLast": false
          }
        }
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "@stylistic/semi": [
        "error",
        "never"
      ],
      "@stylistic/block-spacing": [
        "error",
        "always"
      ],
      "@stylistic/array-bracket-spacing": [
        "error",
        "always"
      ],
      "@stylistic/space-before-blocks": [
        "error",
        "always"
      ],
      "@stylistic/space-in-parens": [
        "error",
        "always"
      ],
      "@stylistic/space-before-function-paren": [
        "error",
        {
          "anonymous": "always",
          "named": "always",
          "asyncArrow": "always"
        }
      ],
      "@stylistic/keyword-spacing": [
        "error",
        {
          before: true,
          after: true,
        },
      ],
      "@stylistic/function-call-spacing": [
        "error",
        "always"
      ],
      "@stylistic/object-curly-spacing": [
        "error", "always"
      ],
      "@stylistic/quotes": [
        "error",
        "double",
        {
          "avoidEscape": true,
          "allowTemplateLiterals": "always"
        }
      ],
      "@stylistic/indent": [
        "error",
        2,
        {
          "SwitchCase": 1,
          "FunctionDeclaration": {
            "body": 1,
            "parameters": "first"
          },
          "FunctionExpression": {
            "body": 1,
            "parameters": "first"
          }
        }
      ],
      "no-unused-expressions": "error",
      "no-unused-labels": "error",
      "@stylistic/member-ordering": "off",
      "arrow-parens": [
        "off",
        "always"
      ],
      "import/order": "off",
      "max-len": [
        "error",
        {
          "ignorePattern": "^import [^,]+ from |^export | implements",
          "code": 150
        }
      ]
    }
  }
)