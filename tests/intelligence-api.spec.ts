import { test, expect } from '@playwright/test'
import {
  mockCrowding,
  mockRecommendations,
  demoTimes,
} from '../src/data/intelligenceDemo'
import type { RecommendationRequest } from '../src/domain/personalization'

test('장소 선택 중 명시된 혼잡도 ID를 조회하고 실패해도 선택을 유지한다', async ({
  page,
}) => {
  let fail = true
  let requests = 0
  await page.route('**/places?*', (route) =>
    route.fulfill({
      json: {
        places: [
          {
            id: '1',
            name: '혼잡도 연결 장소',
            category: '여행 > 공원',
            categoryGroup: 'AT4',
            address: '경기 용인시 기흥구',
            roadAddress: '',
            phone: '',
            location: { lat: 37.25, lng: 127.11 },
            url: 'https://place.map.kakao.com/1',
            crowdingPlaceId: 'demo_park_01',
          },
        ],
        page: 1,
        isEnd: true,
        query: '공원',
        totalCount: 1,
        pageableCount: 1,
        source: '카카오맵',
        fetchedAt: new Date().toISOString(),
      },
    }),
  )
  await page.route('https://be.example.test/api/crowding/estimate', (route) => {
    requests++
    expect(route.request().postDataJSON().placeId).toBe('demo_park_01')
    return route.fulfill(
      fail
        ? {
            status: 503,
            json: {
              data: null,
              error: { code: 'UNAVAILABLE', message: '실패' },
            },
          }
        : {
            json: {
              data: mockCrowding('demo_park_01', demoTimes[0]),
              error: { code: null, message: null },
            },
          },
    )
  })
  await page.goto('/#/places?q=공원')
  await page.getByRole('button', { name: /혼잡도: 정보 없음/ }).click()
  const panel = page.getByRole('dialog', { name: '혼잡도 상세' })
  await expect(panel).toContainText('혼잡도를 불러오지 못했어요')
  await expect(page.locator('.crowding-status')).toHaveCount(0)
  await panel.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /로 하루 코스 만들기/ }),
  ).toBeEnabled()
  await page.getByRole('button', { name: /혼잡도: 정보 없음/ }).click()
  fail = false
  await page.getByRole('button', { name: '혼잡도 다시 확인' }).click()
  await expect(panel).toContainText('72.5%')
  expect(requests).toBeGreaterThanOrEqual(2)
})

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
  await expect(page.locator('.mode-badge')).toHaveCount(0)
  await expect(page.locator('.recommendation-card')).toHaveCount(2)
  await expect(page.locator('.recommendation-card').first()).toContainText(
    'BE 연동',
  )
  fail = true
  await page.getByRole('button', { name: '다시 추천', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('마지막 성공 결과')
  await expect(page.locator('.recommendation-card')).toHaveCount(2)
  await page.getByLabel('원하는 하루', { exact: true }).fill('카페')
  await page.getByRole('button', { name: '추천받기', exact: true }).click()
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
