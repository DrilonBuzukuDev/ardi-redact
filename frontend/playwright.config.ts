import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:1431",
    viewport: { width: 680, height: 860 },
  },
  webServer: {
    command: "pnpm dev --port 1431 --strictPort",
    url: "http://127.0.0.1:1431",
    reuseExistingServer: false,
  },
});
