import { defineConfig, devices } from "@playwright/test";

// Browser tests mutate the real DB; they create rows with a UNDO_E2E_ prefix
// and clean them up themselves. Run against a local next dev server unless
// an explicit TEST_BASE_URL is set.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,       // serialize to avoid cross-test audit-log noise
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000/backlog",
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
