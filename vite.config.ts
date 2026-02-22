import { defineConfig } from "vite";

export default defineConfig({
  base: "/sling-survivor/",
  server: {
    port: 5173
  },
  test: {
    include: ["src/**/*.test.ts"]
  }
});
