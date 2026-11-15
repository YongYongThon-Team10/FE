import { test, expect } from '@playwright/test'
import {
  mockCrowding,
  mockRecommendations,
  demoTimes,
} from '../src/data/intelligenceDemo'
import type { RecommendationRequest } from '../src/domain/personalization'

test('실서버 모드는 선호도와 위치를 전송하며 오류를 목업으로 바꾸지 않는다', async ({
  page,
}) => {
  let fail = false
  let count = 0
  await page.route(
    'https://be.example.test/api/recommendations',
    async (route) => {
      count++
      if (fail)
        return route.fulfill({
          status: 503,
          json: {
            data: null,
            error: { code: 'UPSTREAM_UNAVAILABLE', message: '연결 실패' },
          },
        })
      const body = route.request().postDataJSON() as RecommendationRequest
      expect(body.profile.categoryWeights.cafe).toBe(3)
      expect(body.center.lat).toBeCloseTo(37.2411)
      const result = mockRecommendations({ ...body, visitAt: demoTimes[0] })
      result.rankingMethod = 'openai'
      result.items = result.items
        .slice(0, 2)
        .map((item) => ({ ...item, name: `BE 연동 ${item.name}` }))
      await route.fulfill({
        json: { data: result, error: { code: null, message: null } },
      })
    },
  )
  await page.route('https://be.example.test/api/crowding/estimate', (route) => {
    const body = route.request().postDataJSON()
    return route.fulfill({
      json: {
        data: mockCrowding(body.placeId, body.at),
        error: { code: null, message: null },
      },
    })
  })
  await page.goto('/#/recommendations')
  await expect(page.locator('.mode-badge')).toHaveText('BE API 연결 모드')
  await expect(page.locator('.recommendation-card')).toHaveCount(2)
  await expect(page.locator('.recommendation-card').first()).toContainText(
    'BE 연동',
  )
  fail = true
  await page.getByRole('button', { name: '정보 새로고침', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('마지막 성공 결과')
  await expect(page.locator('.recommendation-card')).toHaveCount(2)
  await page.getByLabel('원하는 하루', { exact: true }).fill('카페')
  await page
    .getByRole('button', { name: '조건으로 추천받기', exact: true })
    .click()
  await expect(page.locator('.recommendation-card')).toHaveCount(0)
  await expect(page.getByRole('alert')).toBeVisible()
  expect(count).toBeGreaterThanOrEqual(3)
})

test('30초 재조회가 동작하고 화면 이탈 후 요청을 중단한다', async ({
  page,
}) => {
  let count = 0
  await page.route('https://be.example.test/api/recommendations', (route) => {
    count++
    return route.fulfill({
      json: {
        data: mockRecommendations({
          ...route.request().postDataJSON(),
          visitAt: demoTimes[0],
        }),
        error: { code: null, message: null },
      },
    })
  })
  await page.clock.install()
  await page.goto('/#/recommendations')
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  const before = count
  await page.clock.fastForward(31000)
  await expect.poll(() => count).toBeGreaterThan(before)
  await page.goto('/#/mypage')
  const stopped = count
  await page.clock.fastForward(61000)
  expect(count).toBe(stopped)
})
