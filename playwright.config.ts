import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/smoke',
  workers: 1, // software-rendered browsers are CPU hungry; run them one at a time
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] },
  },
  webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173, reuseExistingServer: true, timeout: 120_000 },
});
