import { defineConfig } from '@playwright/test'
const demoPort = Number(process.env.PLAYWRIGHT_DEMO_PORT ?? 5173)
if (!Number.isInteger(demoPort) || demoPort < 1024 || demoPort > 65535)
  throw new Error('PLAYWRIGHT_DEMO_PORT는 유효한 포트 번호여야 합니다.')
const demoOrigin = `http://127.0.0.1:${demoPort}`
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
      testIgnore:
        /(?:remote|real-places|backend-contract|team-api|personalization-contract|intelligence-api)\.spec\.ts/,
      use: { baseURL: demoOrigin },
    },
    {
      name: 'backend-contract',
      testMatch: /(?:backend|personalization)-contract\.spec\.ts/,
    },
    {
      name: 'team-api',
      testMatch: /team-api\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5176' },
    },
    {
      name: 'real-places',
      testMatch: /real-places\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5175' },
    },
    {
      name: 'intelligence-api',
      testMatch: /intelligence-api\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5177' },
    },
    {
      name: 'api-integration',
      testMatch: /remote\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5174' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort',
      url: 'http://127.0.0.1:5177',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: '',
        VITE_TEAM_API_BASE_URL: 'https://be.example.test',
        VITE_INTELLIGENCE_MODE: 'api',
        VITE_PLACES_API_BASE: '',
        VITE_KAKAO_JAVASCRIPT_KEY: '',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5176 --strictPort',
      url: 'http://127.0.0.1:5176',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: '',
        VITE_TEAM_API_BASE_URL: 'https://be.example.test',
        VITE_PLACES_API_BASE: '/api',
        VITE_KAKAO_JAVASCRIPT_KEY: '',
      },
    },
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
      command: `npm run dev -- --host 127.0.0.1 --port ${demoPort} --strictPort`,
      url: demoOrigin,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: '',
        VITE_TEAM_API_BASE_URL: '',
        VITE_PLACES_API_BASE: '',
        VITE_INTELLIGENCE_MODE: 'mock',
        VITE_KAKAO_JAVASCRIPT_KEY: '',
      },
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
