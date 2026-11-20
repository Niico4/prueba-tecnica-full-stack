import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: "es2023",
      },
      module: { type: "es6" },
    }),
  ],
  test: {
    include: ["test/**/*.spec.ts"],
    exclude: ["test/**/*.e2e-spec.ts"],
    setupFiles: ["test/setup.ts"],
  },
});
