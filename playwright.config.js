import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 1,
  reporter: 'list',
  use: { baseURL:'http://127.0.0.1:3100', trace:'retain-on-failure' },
  webServer: { command:'node scripts/dev.mjs --preview', env:{PORT:'3100',SITE_URL:'https://example.com/'}, url:'http://127.0.0.1:3100', reuseExistingServer:!process.env.CI },
  projects: [
    { name:'desktop', use:{ ...devices['Desktop Chrome'] } },
    { name:'mobile', use:{ ...devices['iPhone 13'], defaultBrowserType:'chromium' } },
    { name:'reduced-motion', use:{ ...devices['Desktop Chrome'], reducedMotion:'reduce' } }
  ]
});
