import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const examples = JSON.parse(
  readFileSync('tests/fixtures/team-api.json', 'utf8'),
)
test('BE 가입은 즉시 로그인되며 실제 signin과 Bearer 로그아웃 규격을 사용', async ({
  page,
}) => {
  const calls: string[] = []
  await page.route('https://be.example.test/**', (route) => {
    const path = new URL(route.request().url()).pathname
    calls.push(path)
    if (path.endsWith('/logout')) {
      expect(route.request().headers()['authorization']).toBe(
        `Bearer ${examples['1'].data.accessToken}`,
      )
      return route.fulfill({
        json: { data: null, error: { code: null, message: null } },
      })
    }
    return route.fulfill({ json: examples['1'] })
  })
  await page.goto('/#/register')
  await page.getByLabel('이름', { exact: true }).fill('홍길동')
  await page
    .getByPlaceholder('이메일', { exact: true })
    .fill('user@example.com')
  await page.getByPlaceholder('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '회원가입', exact: true }).click()
  await expect(page).toHaveURL(/#\/$/)
  expect(calls).toContain('/api/v1/auth/signup')
  await page.goto('/#/login')
  await page
    .getByPlaceholder('이메일', { exact: true })
    .fill('user@example.com')
  await page.getByPlaceholder('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/#\/$/)
  expect(calls).toContain('/api/v1/auth/signin')
  await page.goto('/#/settings?dialog=logout')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '로그아웃', exact: true })
    .click()
  await expect.poll(() => calls.includes('/api/v1/auth/logout')).toBe(true)
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  )
  expect(storage).not.toContain(examples['1'].data.accessToken)
})
test('수신 API 문서 응답으로 행사 목록, 상세, 출발지 선택 및 서버 일정 생성', async ({
  page,
}) => {
  let created = false
  await page.route('https://be.example.test/**', (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/events') {
      expect(u.searchParams.get('page')).toBe('0')
      expect(u.searchParams.get('dateFrom')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      return route.fulfill({ json: examples['5'] })
    }
    if (u.pathname.startsWith('/api/events/'))
      return route.fulfill({ json: examples['6'] })
    if (u.pathname === '/api/places/search')
      return route.fulfill({ json: examples['9'] })
    if (u.pathname === '/api/itineraries') {
      const input = route.request().postDataJSON()
      expect(input.baseEventId).toBe(examples['6'].data.eventId)
      expect(input.origin.type).toBe('manual')
      expect(input.origin.lat).toBe(examples['9'].data.places[0].lat)
      created = true
      return route.fulfill({ json: examples['12'] })
    }
    if (u.pathname.startsWith('/api/itineraries/'))
      return route.fulfill({ json: examples['12'] })
    return route.fulfill({ status: 404 })
  })
  await page.goto('/#/festivals')
  await page.getByRole('link', { name: '행사 자세히 보기' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    examples['6'].data.name,
  )
  await page.getByLabel('출발지', { exact: true }).fill('기흥역')
  await page.getByRole('button', { name: '출발지 검색', exact: true }).click()
  await page
    .getByRole('button', {
      name: new RegExp(examples['9'].data.places[0].name),
    })
    .click()
  await page
    .getByRole('button', { name: '행사 일정 생성', exact: true })
    .click()
  await expect(page).toHaveURL(/festival-itinerary/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    examples['12'].data.title,
  )
  expect(created).toBe(true)
  await expect(page.locator('body')).toContainText('공용 데모')
})
test('행사 빈 결과와 실패 재시도, 재조회에서 시연 행사로 대체하지 않음', async ({
  page,
}) => {
  let failed = true
  await page.route('https://be.example.test/**', (route) =>
    failed
      ? route.fulfill({
          status: 502,
          json: { data: null, error: { code: 'C500', message: 'internal' } },
        })
      : route.fulfill({
          json: {
            data: { totalCount: 0, page: 0, size: 12, events: [] },
            error: { code: null, message: null },
          },
        }),
  )
  await page.goto('/#/festivals')
  await expect(page.getByRole('alert')).toBeVisible()
  failed = false
  await page.getByRole('button', { name: '다시 불러오기' }).click()
  await expect(
    page.getByRole('heading', { name: '조회된 행사가 없어요' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: '행사 자세히 보기' }),
  ).toHaveCount(0)
})
