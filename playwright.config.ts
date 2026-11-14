import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      testIgnore: /(?:remote|real-places)\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5173' },
    },
    {
      name: 'real-places',
      testMatch: /real-places\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5175' },
    },
    {
      name: 'api-integration',
      testMatch: /remote\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5174' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: '',
        VITE_PLACES_API_BASE: '/api',
        VITE_KAKAO_JAVASCRIPT_KEY: '',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_BASE_URL: '', VITE_KAKAO_JAVASCRIPT_KEY: '' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:5199/api',
        VITE_DATA_REFRESH_MS: '15000',
        VITE_KAKAO_JAVASCRIPT_KEY: '',
      },
    },
  ],
})
