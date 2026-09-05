import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const authFile = "e2e/.auth/user.json";
const user2AuthFile = "e2e/.auth/user2.json";
const inactiveAuthFile = "e2e/.auth/inactive.json";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "blocked",
      dependencies: ["setup"],
      testMatch: /blocked\.spec\.ts/,
      use: { ...devices["iPhone 13"], storageState: inactiveAuthFile },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /fcp\.spec\.ts/, /blocked\.spec\.ts/],
      use: { ...devices["iPhone 13"], storageState: authFile },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /fcp\.spec\.ts/, /blocked\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "fcp",
      dependencies: ["setup"],
      testMatch: /fcp\.spec\.ts/,
      use: { ...devices["iPhone 13"], storageState: authFile },
    },
  ],
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
});

export { authFile, user2AuthFile, inactiveAuthFile, baseURL };
