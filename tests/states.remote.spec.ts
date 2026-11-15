import { expect, test } from '@playwright/test'
import { demoCatalog } from '../src/data/demo'
import { designCourse } from '../src/data/scenarios'
import { facilityDemo } from '../src/data/facilities'

const headers = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5174',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
test('서버 일정 생성 중 → 오류 → 재시도 → 완료, 재생성 취소 시 요청을 중단한다', async ({
  page,
}) => {
  let calls = 0
  let hold = false
  let release: (() => void) | undefined
  await page.route('http://127.0.0.1:5199/api/**', async (route) => {
    const url = route.request().url()
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers })
    if (url.endsWith('/catalog'))
      return route.fulfill({ headers, json: demoCatalog })
    if (url.endsWith('/auth/session'))
      return route.fulfill({ headers, json: null })
    if (url.endsWith('/places/geocode'))
      return route.fulfill({ headers, json: { lat: 37.275, lng: 127.116 } })
    if (url.endsWith('/courses/generate')) {
      calls++
      if (hold) {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        await route
          .fulfill({
            headers,
            json: { ...designCourse(), id: 'server-course', isDemo: false },
          })
          .catch(() => {})
        return
      }
      return calls === 1
        ? route.fulfill({ status: 503, headers, json: {} })
        : route.fulfill({
            headers,
            json: { ...designCourse(), id: 'server-course', isDemo: false },
          })
    }
    return route.fulfill({ status: 404, headers, json: {} })
  })
  await page.goto('/#/configure/lake-market')
  await page.getByLabel('아이 나이').fill('7')
  await page.getByLabel('출발지', { exact: true }).fill('기흥역')
  await page.getByRole('button', { name: '일정 만들기' }).click()
  await expect(
    page.getByRole('heading', { name: '하루를 연결하지 못했어요' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('503')
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(page.locator('.stop-card')).toHaveCount(5)
  await page.getByRole('link', { name: '조건 바꾸기' }).click()
  hold = true
  await page.getByRole('button', { name: '일정 만들기' }).click()
  await expect(page.getByRole('status', { name: '일정 생성 중' })).toBeVisible()
  await expect.poll(() => release !== undefined).toBe(true)
  const aborted = page.waitForEvent('requestfailed', (req) =>
    req.url().endsWith('/courses/generate'),
  )
  await page.getByRole('button', { name: '취소하고 조건으로 돌아가기' }).click()
  await aborted
  release?.()
  await expect(page).toHaveURL(/#\/configure\/lake-market$/)
})
test('시설 이용 수치 주기 갱신과 오류는 마지막 정상값·관측 시각을 유지한다', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-12T14:05:00+09:00') })
  let current = 42
  let fail = false
  await page.route('http://127.0.0.1:5199/api/**', (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/session'))
      return route.fulfill({ headers, json: null })
    if (url.endsWith('/catalog'))
      return route.fulfill({ headers, json: demoCatalog })
    if (fail) return route.fulfill({ status: 503, headers, json: {} })
    return route.fulfill({
      headers,
      json: {
        ...facilityDemo,
        revision: String(current),
        items: facilityDemo.items.map((f) => ({
          ...f,
          source: { ...f.source, isDemo: false },
          occupancy: f.occupancy
            ? {
                ...f.occupancy,
                current: f.id === 'pool' ? current : f.occupancy.current,
              }
            : null,
        })),
      },
    })
  })
  await page.goto('/#/facilities/usage/pool')
  await expect(page.locator('.metric')).toHaveText('35%')
  current = 60
  await page.clock.fastForward(16000)
  await expect(page.locator('.metric')).toHaveText('50%')
  await expect(page.locator('.facility-status').first()).toHaveText('보통')
  fail = true
  await page.clock.fastForward(16000)
  await expect(page.getByRole('alert')).toContainText('마지막으로 확인한 정보')
  await expect(page.locator('.metric')).toHaveText('50%')
})
