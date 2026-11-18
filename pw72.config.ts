import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/smoke', workers: 1, timeout: 60_000,
  use: { baseURL: 'http://localhost:4198', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] } },
  webServer: { command: 'npx vite build --outDir /tmp/dist72 && npx vite preview --outDir /tmp/dist72 --port 4198', port: 4198, reuseExistingServer: false, timeout: 180_000 },
});
