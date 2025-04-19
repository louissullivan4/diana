import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import pluginJs from "@eslint/js";

export default defineConfig([
  globalIgnores(["**/*.test.js", "**/*.spec.js", "node_modules/**"]),
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        process: "readonly",
      },
    },
  },
  {
    languageOptions: { globals: globals.browser },
  },
  pluginJs.configs.recommended,
]);
