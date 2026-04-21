import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load DATABASE_URL_V002 (and friends) from .env.local for the test runner.
try {
  const envPath = resolve(__dirname, ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!m) continue;
    const [, k, rawV] = m;
    const v = rawV.replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  // .env.local optional — the tests themselves will error cleanly if required
  // vars are missing.
}

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
