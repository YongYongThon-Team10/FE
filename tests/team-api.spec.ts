import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const examples = JSON.parse(
  readFileSync('tests/fixtures/team-api.json', 'utf8'),
)
const ok = (data: unknown) => ({ data, error: { code: null, message: null } })

test('BE 통신 실패에도 장소 검색은 유지하고 재시도로 행사 정보를 복구한다', async ({
  page,
}) => {
  let fail = true
  await page.route('https://be.example.test/**', (route) =>
    fail
      ? route.abort('failed')
      : route.fulfill({
          json: ok({ totalCount: 0, events: [], page: 0, size: 100 }),
        }),
  )
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        places: [
          {
            id: '1',
            name: '한국민속촌',
            category: '여행 > 관광,명소',
            categoryGroup: 'AT4',
            address: '경기 용인시 기흥구 보라동 35',
            roadAddress: '',
            phone: '',
            location: { lat: 37.2596, lng: 127.1198 },
            url: 'https://place.map.kakao.com/1',
          },
        ],
        isEnd: true,
        totalCount: 1,
        pageableCount: 1,
        query: '한국민속촌',
        page: 1,
        source: '카카오맵',
        fetchedAt: new Date().toISOString(),
      },
    }),
  )
  await page.goto('/#/search?q=한국민속촌')
  await expect(page.getByRole('alert')).toContainText(
    '서버에 연결하지 못했어요',
  )
  await expect(page.getByRole('alert')).toContainText(
    '장소 검색은 아래에서 계속 이용',
  )
  await expect(
    page.getByRole('button', {
      name: '한국민속촌로 하루 코스 만들기',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Failed to fetch')
  fail = false
  await page
    .getByRole('button', { name: '행사 검색 다시 시도', exact: true })
    .click()
  await expect(
    page.getByRole('region', { name: '행사 검색 결과' }),
  ).toContainText('행사 검색 결과 0건')
  await expect(page.getByRole('alert')).toHaveCount(0)
  fail = true
  await page.goto('/#/festivals')
  await expect(
    page.getByRole('link', {
      name: '실제 장소로 하루 코스 만들기',
      exact: true,
    }),
  ).toBeVisible()
})

test('실제 행사 캘린더는 월·날짜를 조회하고 공용 서버 코스는 개인 목록에 노출하지 않는다', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00+09:00'))
  let fail = false
  await page.route('https://be.example.test/**', (route) => {
    const u = new URL(route.request().url())
    if (fail) return route.fulfill({ status: 503, json: ok(null) })
    const event = {
      eventId: 'YI-1',
      name: '실제 서버 행사',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    }
    return route.fulfill({
      json: ok(
        u.searchParams.get('dateFrom') !== u.searchParams.get('dateTo')
          ? {
              totalCount: 1,
              page: 0,
              size: 1,
              events: [event],
              courses: [
                {
                  title: '다른 사용자 공용 코스',
                  itineraryId: 'other',
                  date: '2026-11-15',
                },
              ],
            }
          : {
              totalCount: 1,
              page: 0,
              size: 1,
              events: [event],
              courses: [
                { title: '다른 사용자 공용 코스', itineraryId: 'other' },
              ],
              eventCount: 1,
              courseCount: 1,
            },
      ),
    })
  })
  await page.goto('/#/calendar')
  await expect(
    page.getByRole('link', { name: '행사 실제 서버 행사' }),
  ).toHaveAttribute('href', '#/festivals/YI-1')
  await expect(page.locator('body')).toContainText('행사 1개 · 저장한 코스 0개')
  await expect(page.locator('body')).not.toContainText('다른 사용자 공용 코스')
  fail = true
  await page.getByRole('button', { name: '2026-11-16 일정 보기' }).click()
  await expect(
    page.getByRole('button', { name: '선택 날짜 다시 불러오기' }),
  ).toBeVisible()
  await expect(page.locator('body')).not.toContainText(
    '이 날짜에 등록된 일정이 없어요',
  )
  fail = false
  await page.getByRole('button', { name: '선택 날짜 다시 불러오기' }).click()
  await expect(
    page.getByRole('link', { name: '행사 실제 서버 행사' }),
  ).toBeVisible()
})

test('행사 목록은 상세 복귀와 새로고침 후 지역·날짜·페이지를 유지한다', async ({
  page,
}) => {
  await page.route('https://be.example.test/**', (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/events')
      return route.fulfill({
        json: ok({
          ...examples['5'].data,
          totalCount: 40,
          page: Number(u.searchParams.get('page')),
          size: 12,
        }),
      })
    return route.fulfill({ json: examples['6'] })
  })
  await page.goto('/#/festivals')
  await page.getByLabel('시작 날짜', { exact: true }).fill('2026-11-20')
  await page.getByLabel('종료 날짜', { exact: true }).fill('2026-11-25')
  await page
    .getByRole('combobox', { name: '지역', exact: true })
    .selectOption('수지구')
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page.getByText('2페이지', { exact: true })).toBeVisible()
  await page
    .getByRole('link', { name: '행사 자세히 보기', exact: true })
    .click()
  await page.getByRole('link', { name: '행사 목록', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('combobox', { name: '지역', exact: true }),
  ).toHaveValue('수지구')
  await expect(page.getByLabel('시작 날짜', { exact: true })).toHaveValue(
    '2026-11-20',
  )
  await expect(page.getByLabel('종료 날짜', { exact: true })).toHaveValue(
    '2026-11-25',
  )
  await expect(page.getByText('2페이지', { exact: true })).toBeVisible()
})

test('홈 통합 검색은 여러 페이지의 행사명과 실제 장소를 함께 검색하고 조건 문장을 반영한다', async ({
  page,
}) => {
  const fetched: number[] = []
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        places: [],
        query: 'q',
        page: 1,
        isEnd: true,
        totalCount: 0,
        pageableCount: 0,
        source: '카카오맵',
        fetchedAt: new Date().toISOString(),
      },
    }),
  )
  await page.route('https://be.example.test/**', (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/api/search/parse')
      return route.fulfill({
        json: ok({
          parsed: true,
          conditions: {
            dateFrom: '2026-11-16',
            dateTo: '2026-11-16',
            district: ['수지구'],
            budget: 'free',
          },
          unresolved: [],
          message: null,
        }),
      })
    const n = Number(u.searchParams.get('page'))
    fetched.push(n)
    return route.fulfill({
      json: ok({
        totalCount: 101,
        page: n,
        size: 100,
        events: n
          ? [
              {
                ...examples['5'].data.events[0],
                eventId: 'YI-9999',
                name: '상상플리마켓 공연',
                category: '공연',
              },
            ]
          : Array.from({ length: 100 }, (_, i) => ({
              ...examples['5'].data.events[0],
              eventId: `YI-${i}`,
              name: `다른 행사 ${i}`,
              category: '행사',
              subCategory: null,
              summary: null,
              tags: [],
            })),
      }),
    })
  })
  await page.goto('/#/')
  await page.getByLabel('어떤 하루를 보내고 싶으세요?').fill('상상플리마켓')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(
    page.getByRole('link', { name: '상상플리마켓 공연', exact: true }),
  ).toBeVisible()
  expect(fetched).toContain(1)
  await expect(
    page.getByRole('region', { name: '장소 검색 결과' }),
  ).toContainText('검색된 장소가 없어요')
  await page.getByLabel('통합 검색어').fill('내일 수지구 무료 공연')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(
    page.getByRole('region', { name: '행사 검색 결과' }),
  ).toContainText('2026-11-16 ~ 2026-11-16')
  await expect(
    page.getByRole('link', { name: '상상플리마켓 공연', exact: true }),
  ).toBeVisible()
  await page.setViewportSize({ width: 320, height: 800 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('행사 코스를 브라우저 편집본으로 저장하고 지도·도움말·수정·공유·재접속까지 연결한다', async ({
  page,
  browser,
}) => {
  const itinerary = structuredClone(examples['12'])
  itinerary.data.baseEventId = itinerary.data.slots[0].eventId
  const mutations: string[] = []
  await page.route('https://be.example.test/**', (route) => {
    if (route.request().method() !== 'GET')
      mutations.push(route.request().method())
    return route.fulfill({ json: itinerary })
  })
  await page.route('**/api/nearby?*', (route) =>
    route.fulfill({
      json: {
        places: [],
        query: 'q',
        page: 1,
        isEnd: true,
        totalCount: 0,
        pageableCount: 0,
        source: '카카오맵',
        fetchedAt: new Date().toISOString(),
      },
    }),
  )
  await page.goto(`/#/festival-itinerary/${itinerary.data.itineraryId}`)
  await page
    .getByRole('button', { name: '이 브라우저에 저장하고 편집', exact: true })
    .click()
  await expect(page).toHaveURL(/#\/course\//)
  const localUrl = page.url()
  const title = itinerary.data.slots[0].title
  await expect(page.locator('.stop-card').first()).toContainText(
    '11:00 — 12:00',
  )
  await page.getByLabel(`${title} 체류 시간(분)`).fill('90')
  await page.getByLabel(`${title} 체류 시간(분)`).press('Tab')
  await page.goto('/#/help')
  await page
    .getByRole('link', { name: '코스 조건 바꾸기 →', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: '실제 장소로 하루를 연결해요' }),
  ).toBeVisible()
  await expect(page.getByLabel('선택 장소 체류 시간(분)')).toHaveValue('90')
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.getByLabel(`${title} 체류 시간(분)`)).toHaveValue('90')
  await page.getByRole('link', { name: /지도에서 동선 확인하기/ }).click()
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible()
  await page.goto(localUrl)
  await page.reload()
  await expect(page.getByLabel(`${title} 체류 시간(분)`)).toHaveValue('90')
  await page.getByRole('link', { name: /저장 · 공유/ }).click()
  await page.getByRole('button', { name: /공유 일정 미리보기/ }).click()
  await expect(
    page.getByRole('button', { name: '내 일정으로 가져오기' }),
  ).toBeVisible()
  const receiverContext = await browser.newContext()
  try {
    const receiver = await receiverContext.newPage()
    await receiver.goto(page.url())
    await receiver.getByRole('link', { name: /지도에서 동선 확인하기/ }).click()
    await expect(receiver.locator('.leaflet-marker-icon').first()).toBeVisible()
    await receiver
      .getByRole('button', { name: '뒤로 가기', exact: true })
      .click()
    await receiver
      .getByRole('button', { name: '이 브라우저에 저장', exact: true })
      .click()
    await expect(
      receiver.getByRole('link', { name: '코스 열기 →', exact: true }),
    ).toBeVisible()
  } finally {
    await receiverContext.close()
  }
  expect(mutations).toEqual([])
  const raw = await page.evaluate(() =>
    localStorage.getItem('yongin.courses.v1'),
  )
  expect(raw).not.toContain('경기도 용인시 기흥구 중부대로')
})

test('서버 미지원 계정 기능은 실행 전에 안내하고 비활성화한다', async ({
  page,
}) => {
  await page.goto('/#/reset-password')
  await expect(
    page.getByRole('button', { name: '재설정 메일 받기' }),
  ).toBeDisabled()
  await expect(page.getByRole('status')).toContainText(
    '비밀번호 재설정을 지원하지',
  )
  await page.goto('/#/privacy')
  await expect(
    page.getByRole('button', { name: '회원 탈퇴', exact: true }),
  ).toBeDisabled()
  await expect(page.locator('body')).toContainText(
    '회원 탈퇴는 서버 연결을 준비 중',
  )
})

test('행사 편집본은 미정·자정 이후 시간을 보관하며 좌표가 없어도 조건 수정이 가능하다', async ({
  page,
}) => {
  const itinerary = structuredClone(examples['12'])
  itinerary.data.slots[0].startTime = null
  itinerary.data.slots[0].endTime = null
  itinerary.data.slots[0].place.lat = null
  itinerary.data.slots[0].place.lng = null
  itinerary.data.slots[2].startTime = '24:10'
  itinerary.data.slots[2].endTime = '24:35'
  await page.route('https://be.example.test/**', (route) =>
    route.fulfill({ json: itinerary }),
  )
  await page.goto(`/#/festival-itinerary/${itinerary.data.itineraryId}`)
  await page
    .getByRole('button', { name: '이 브라우저에 저장하고 편집' })
    .click()
  await expect(page.locator('.stop-card').first()).toContainText(
    '시간 미정 — 시간 미정',
  )
  await expect(page.locator('.stop-card').last()).toContainText('24:10 — 24:35')
  await page.reload()
  await expect(page.locator('.stop-card').last()).toContainText('24:10 — 24:35')
  await page.getByRole('link', { name: '조건 바꾸기', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '코스 조건 바꾸기', exact: true }),
  ).toBeVisible()
  await page.getByLabel('종료 시간').fill('19:00')
  await page.getByRole('button', { name: '조건 반영' }).click()
  await expect(page.locator('.stop-card')).toHaveCount(3)
})

test('통합 검색의 행사 오류는 장소 결과를 막지 않고 다시 시도할 수 있다', async ({
  page,
}) => {
  let fail = true
  await page.route('https://be.example.test/**', (route) =>
    fail
      ? route.fulfill({ status: 503, json: ok(null) })
      : route.fulfill({
          json: ok({ totalCount: 0, page: 0, size: 100, events: [] }),
        }),
  )
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        places: [],
        page: 1,
        isEnd: true,
        totalCount: 0,
        pageableCount: 0,
        query: 'x',
        source: '카카오맵',
        fetchedAt: new Date().toISOString(),
      },
    }),
  )
  await page.goto('/#/search?q=공원')
  await expect(
    page.getByRole('region', { name: '행사 검색 결과' }).getByRole('alert'),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: '장소 검색 결과' }),
  ).toContainText('장소 검색 결과 0곳')
  fail = false
  await page.getByRole('button', { name: '행사 검색 다시 시도' }).click()
  await expect(
    page.getByRole('region', { name: '행사 검색 결과' }),
  ).toContainText('행사 검색 결과 0건')
})
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
  await expect(page.locator('.data-footer')).not.toContainText('시연 데이터')
  await expect(
    page.getByRole('link', { name: '행사 자세히 보기' }),
  ).toHaveCount(0)
})

test('BE의 임시 공유 URL 대신 FE 링크를 만들고 다른 세션에서 서버 공유 일정을 연다', async ({
  page,
  browser,
}) => {
  const shareId = examples['21'].data.shareId
  const handle = async (route: import('@playwright/test').Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/share')) {
      expect(route.request().method()).toBe('POST')
      return route.fulfill({
        json: {
          ...examples['21'],
          data: {
            ...examples['21'].data,
            shareUrl: 'https://example.com/placeholder',
          },
        },
      })
    }
    if (path.startsWith('/api/shared/'))
      return route.fulfill({ json: examples['22'] })
    if (path.startsWith('/api/itineraries/'))
      return route.fulfill({ json: examples['12'] })
    return route.fulfill({ status: 404 })
  }
  await page.route('https://be.example.test/**', handle)
  await page.goto(`/#/festival-itinerary/${examples['12'].data.itineraryId}`)
  await page
    .getByRole('button', { name: '행사 일정 공유 링크 만들기', exact: true })
    .click()
  const address = await page
    .getByLabel('공유 주소', { exact: true })
    .inputValue()
  expect(address).toBe(`http://127.0.0.1:5176/#/festival-shared/${shareId}`)
  const other = await browser.newContext()
  try {
    const receiver = await other.newPage()
    await receiver.route('https://be.example.test/**', handle)
    await receiver.goto(address)
    await expect(receiver.getByRole('heading', { level: 1 })).toHaveText(
      examples['22'].data.title,
    )
    await expect(receiver.locator('main article')).toHaveCount(
      examples['22'].data.slots.length,
    )
    await expect(
      receiver.getByRole('link', { name: '나도 행사 찾아보기' }),
    ).toBeVisible()
    await expect(receiver.locator('.data-footer')).not.toContainText(
      '시연 데이터',
    )
  } finally {
    await other.close()
  }
})

test('공유 생성 실패는 재시도하며 잘못된 공유 응답은 화면 오류로 복구한다', async ({
  page,
}) => {
  let fail = true
  await page.route('https://be.example.test/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/share'))
      return fail
        ? route.fulfill({
            status: 503,
            json: { data: null, error: { code: 'C500', message: 'internal' } },
          })
        : route.fulfill({ json: examples['21'] })
    if (path.startsWith('/api/shared/'))
      return route.fulfill({
        json: {
          data: {
            ...examples['22'].data,
            slots: [{ order: 1, type: 'event', title: { invalid: true } }],
          },
          error: { code: null, message: null },
        },
      })
    return route.fulfill({ json: examples['12'] })
  })
  await page.goto(`/#/festival-itinerary/${examples['12'].data.itineraryId}`)
  await page
    .getByRole('button', { name: '행사 일정 공유 링크 만들기', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('백엔드 연결에 실패')
  fail = false
  await page
    .getByRole('button', { name: '행사 일정 공유 링크 만들기', exact: true })
    .click()
  await page.getByRole('link', { name: '공유 일정 열기', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('공유 일정 응답을 확인')
  await expect(
    page.getByRole('button', { name: '다시 불러오기' }),
  ).toBeVisible()
})
