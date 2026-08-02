import { defineConfig } from "vitest/config";
import { transformWithEsbuild } from "vite";
import path from "node:path";

export default defineConfig({
  // Next.js allows JSX in plain .js files (its own compiler handles that); Vite's
  // default JSX handling only kicks in for .jsx/.tsx, so transform .js under src
  // through esbuild's JSX loader ourselves.
  plugins: [
    {
      name: "load-js-files-as-jsx",
      async transform(code, id) {
        if (!id.match(/\/src\/.*\.js$/)) return null;
        return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic" });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.js"],
      exclude: ["src/**/__tests__/**"],
    },
  },
});
