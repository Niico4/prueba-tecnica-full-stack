import { defineConfig } from "vitest/config";
import base from "./vitest.config.js";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["test/**/*.e2e-spec.ts"],
    exclude: [],
    fileParallelism: false,
  },
});
