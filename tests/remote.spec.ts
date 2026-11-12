import { expect, test } from '@playwright/test'
import { demoCatalog } from '../src/data/demo'

test('서버 갱신·실패·재시도에 목록과 마커가 동기화되고 시연값으로 대체되지 않는다', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-12T12:00:00+09:00') })
  let revision = 1
  let fail = false
  const catalog = structuredClone(demoCatalog)
  catalog.events.forEach((e) => {
    e.source.isDemo = false
  })
  await page.route('http://127.0.0.1:5199/api/**', async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:5174',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers })
    if (route.request().url().endsWith('/auth/session'))
      return route.fulfill({ status: 200, headers, json: null })
    if (fail)
      return route.fulfill({
        status: 503,
        headers,
        json: { error: 'unavailable' },
      })
    return route.fulfill({
      status: 200,
      headers,
      json: {
        ...catalog,
        revision: String(revision),
        updatedAt:
          revision === 1
            ? '2026-11-12T01:00:00+09:00'
            : '2026-11-12T02:00:00+09:00',
        events: catalog.events.map((e, i) =>
          i === 0 ? { ...e, name: `실측 행사 v${revision}` } : e,
        ),
      },
    })
  })
  await page.goto('/#/map')
  await expect(
    page.locator('.leaflet-marker-icon[title="실측 행사 v1"]'),
  ).toBeVisible()
  revision = 2
  await page.getByRole('button', { name: '새로고침' }).click()
  await expect(
    page.locator('.leaflet-marker-icon[title="실측 행사 v2"]'),
  ).toBeVisible()
  await expect(
    page.locator('.leaflet-marker-icon[title="실측 행사 v1"]'),
  ).toHaveCount(0)
  fail = true
  await page.getByRole('button', { name: '새로고침' }).click()
  await expect(page.getByRole('alert')).toContainText('마지막으로 불러온 정보')
  await expect(
    page.locator('.leaflet-marker-icon[title="실측 행사 v2"]'),
  ).toBeVisible()
  fail = false
  revision = 3
  await page.getByRole('button', { name: '다시 불러오기' }).click()
  await expect(
    page.locator('.leaflet-marker-icon[title="실측 행사 v3"]'),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  revision = 4
  await page.clock.fastForward(16000)
  await expect(
    page.locator('.leaflet-marker-icon[title="실측 행사 v4"]'),
  ).toBeVisible()
})
test('최초 API 오류에는 가짜 행사 목록을 표시하지 않는다', async ({ page }) => {
  await page.route('http://127.0.0.1:5199/api/**', (route) =>
    route.fulfill({
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:5174',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: {},
    }),
  )
  await page.goto('/#/events')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(page.getByText('시연 데이터 · 실제')).toHaveCount(0)
})
