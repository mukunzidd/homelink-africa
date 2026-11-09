import { defineConfig } from "@playwright/test";

/**
 * End-to-end journeys against the running dev stack (`make up`), in the
 * Chrome already installed on the machine, so no browser download. One
 * worker: the fixture store is shared, and the suite resets it once at the
 * start (e2e/global-setup.ts).
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE ?? "http://localhost:3100",
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  outputDir: ".e2e-results",
});
