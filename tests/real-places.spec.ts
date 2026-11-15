import { expect, test } from '@playwright/test'
import { mockCrowding, demoTimes } from '../src/data/intelligenceDemo'
const place = (id: string, name: string) => ({
  id,
  name,
  category: '여행 > 공원',
  categoryGroup: 'AT4',
  address: '경기 용인시 기흥구 중동 1',
  roadAddress: '경기 용인시 기흥구 검증로 1',
  phone: '031-123-4567',
  location: { lat: 37.25, lng: 127.11 },
  url: `https://place.map.kakao.com/${id}`,
})
const result = (q: string, page = 1, empty = false) => ({
  places: empty ? [] : [place(String(100 + page), `${q} 검증 장소 ${page}`)],
  query: q,
  page,
  isEnd: page >= 2,
  totalCount: 2,
  pageableCount: 2,
  source: '카카오맵',
  fetchedAt: '2026-11-14T07:00:00Z',
})

test('선택 전에 혼잡도와 시연 여부를 표시하고 누락·잘못된 데이터에도 코스를 만든다', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        ...result('혼잡도'),
        places: [
          {
            ...place('1', '혼잡도 제공 장소'),
            crowding: mockCrowding('demo_park_01', demoTimes[0]),
          },
          place('2', '혼잡도 미제공 장소'),
          {
            ...place('3', '혼잡도 오류 장소'),
            crowding: { current: { occupancyPercent: 100 } },
          },
        ],
      },
    }),
  )
  await page.route('**/api/nearby?*', (route) =>
    route.fulfill({ json: result('근처', 1, true) }),
  )
  await page.goto('/#/places?q=혼잡도')
  const cards = page.locator('.live-place-card')
  await expect(page.getByRole('meter')).toHaveCount(0)
  await cards
    .nth(0)
    .getByRole('button', { name: /혼잡도: 약간 붐빔/ })
    .click()
  const panel = page.getByRole('dialog', { name: '혼잡도 상세' })
  await expect(panel).toContainText('72.5%')
  await expect(panel).toContainText('목업 예시')
  await panel.getByRole('button', { name: '닫기', exact: true }).click()
  await cards.nth(1).locator('.crowding-trigger').click()
  await expect(panel.getByRole('meter')).toBeVisible()
  await expect(panel).toContainText('목업 예시')
  await panel.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(cards.nth(2).locator('.crowding-trigger')).toHaveText(
    '정보 없음',
  )
  await cards
    .nth(0)
    .getByRole('button', { name: /로 하루 코스 만들기/ })
    .click()
  await expect(page.getByRole('meter')).toHaveCount(0)
  await page.getByRole('button', { name: /혼잡도: 약간 붐빔/ }).click()
  await expect(panel).toContainText('72.5%')
  await panel.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '이 장소들로 하루 코스 만들기' }),
  ).toBeEnabled()
})

test('검색의 편의시설은 조회를 유지하고 코스 목적지 선택에서는 제외한다', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        ...result('한국민속촌'),
        places: [
          place('1', '한국민속촌'),
          { ...place('2', '한국민속촌 주차장'), categoryGroup: 'PK6' },
          { ...place('3', '한국민속촌 매표소'), category: '서비스 > 매표소' },
          place('4', '화장실문화박물관'),
        ],
      },
    }),
  )
  await page.goto('/#/places?q=한국민속촌')
  await expect(page.locator('.live-place-card')).toHaveCount(4)
  await expect(
    page.getByRole('button', { name: /로 하루 코스 만들기/ }),
  ).toHaveCount(2)
  await expect(
    page.getByRole('link', { name: '한국민속촌 주차장 ↗', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: '화장실문화박물관로 하루 코스 만들기',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: '지도', exact: true }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(4)
})

test('브라우저가 입력한 날짜는 코스 결과·저장·독립 공유 화면까지 유지한다', async ({
  page,
  browser,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00+09:00'))
  await page.route('**/api/places?*', (route) =>
    route.fulfill({ json: result('선택장소') }),
  )
  await page.route('**/api/nearby?*', (route) =>
    route.fulfill({ json: result('근처', 1, true) }),
  )
  await page.goto('/#/places?q=선택장소')
  await page.getByRole('button', { name: /로 하루 코스 만들기/ }).click()
  await expect(
    page.getByRole('button', { name: '이 장소들로 하루 코스 만들기' }),
  ).toBeEnabled()
  // Simulate a browser picker/autofill updating the control before change fires.
  await page
    .getByLabel('방문 날짜', { exact: true })
    .evaluate((input: HTMLInputElement) => {
      input.value = '2026-11-16'
    })
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.locator('main')).toContainText('2026-11-16')
  await page.getByRole('link', { name: '저장 · 공유' }).click()
  await page
    .getByRole('button', { name: '내 코스에 저장', exact: true })
    .click()
  await page.reload()
  await expect(page.locator('main')).toContainText('2026-11-16')
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('yongin.courses.v1')!),
  )
  expect(stored[0].settings.date).toBe('2026-11-16')
  await page.getByRole('button', { name: '공유 일정 미리보기' }).click()
  const receiver = await browser.newContext()
  try {
    const sharedPage = await receiver.newPage()
    await sharedPage.goto(page.url())
    await expect(sharedPage.locator('main')).toContainText('2026-11-16')
    await sharedPage
      .getByRole('button', { name: '이 브라우저에 저장', exact: true })
      .click()
    const imported = await sharedPage.evaluate(() =>
      JSON.parse(localStorage.getItem('yongin.courses.v1')!),
    )
    expect(imported[0].settings.date).toBe('2026-11-16')
    expect(imported[0].id).not.toBe(stored[0].id)
  } finally {
    await receiver.close()
  }
})

test('실제 장소 모드의 설정·도움말에는 시연 데이터 푸터를 표시하지 않는다', async ({
  page,
}) => {
  for (const path of [
    'settings',
    'notifications',
    'privacy',
    'account',
    'notices',
    'contact',
    'guide',
  ]) {
    await page.goto(`/#/${path}`)
    await expect(page.locator('.data-footer')).not.toContainText('시연 데이터')
    await expect(page.locator('.data-footer')).toContainText('공식 출처')
  }
})

test('검색으로 고른 대표 명소의 사진은 코스와 새로고침 후에도 유지된다', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        ...result('한국민속촌'),
        places: [place('1', '한국민속촌')],
      },
    }),
  )
  await page.route('**/api/nearby?*', (route) =>
    route.fulfill({ json: result('근처', 1, true) }),
  )
  await page.goto('/#/')
  await page.getByLabel('어떤 하루를 보내고 싶으세요?').fill('한국민속촌')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await page
    .getByRole('button', { name: '한국민속촌로 하루 코스 만들기' })
    .click()
  await expect(page).toHaveURL(/#\/plan\//)
  await expect(
    page.getByRole('img', { name: '한국민속촌 대표 사진' }),
  ).toHaveAttribute('src', '/landmarks/folk-village.webp')
  await page.reload()
  await expect(
    page.getByRole('img', { name: '한국민속촌 대표 사진' }),
  ).toBeVisible()
  const draft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('yongin.draft.v1')!),
  )
  expect(draft.stops[0].place.imageUrl).toBe('/landmarks/folk-village.webp')
  expect(draft.stops[0].place.imageCredit.author).toBe('ChenGui')
})

test('BE 이미지 우선, 원본 실패 시 썸네일, 둘 다 실패 시 명소 사진으로 복구', async ({
  page,
}) => {
  let failPrimary = false
  let failThumbnail = false
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        ...result('에버랜드'),
        places: [
          {
            ...place('10', '에버랜드'),
            imageUrl: 'https://images.example.test/full.webp',
            thumbnailUrl: 'https://images.example.test/thumb.webp',
            imageCredit: {
              author: 'BE 제공 사진',
              sourceUrl: 'https://example.test/source',
            },
          },
        ],
      },
    }),
  )
  await page.route('https://images.example.test/**', (route) => {
    const fail = route.request().url().endsWith('/full.webp')
      ? failPrimary
      : failThumbnail
    return fail
      ? route.fulfill({ status: 404 })
      : route.fulfill({
          path: 'public/landmarks/hoam.webp',
          contentType: 'image/webp',
        })
  })
  await page.goto('/#/places?q=에버랜드')
  const image = page.getByRole('img', { name: '에버랜드 대표 사진' })
  await expect(image).toHaveAttribute(
    'src',
    'https://images.example.test/full.webp',
  )
  await expect(page.locator('.photo-credit')).toContainText('BE 제공 사진')
  failPrimary = true
  await page.reload()
  await expect(image).toHaveAttribute(
    'src',
    'https://images.example.test/thumb.webp',
  )
  failThumbnail = true
  await page.reload()
  await expect(image).toHaveAttribute('src', '/landmarks/everland.webp')
  await expect(page.locator('.photo-credit')).toContainText('Wikiwater2020')
  await expect(page.locator('.photo-credit')).not.toContainText('BE 제공 사진')
})

test('알 수 없는 장소의 사진 실패는 깨진 이미지 없이 검색과 코스 선택을 유지', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: {
        ...result('검증 장소'),
        places: [
          {
            ...place('12', '검증 장소'),
            imageUrl: 'https://images.example.test/missing.webp',
          },
        ],
      },
    }),
  )
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ status: 404 }),
  )
  await page.goto('/#/places?q=검증장소')
  await expect(page.locator('.live-place-card')).toContainText('검증 장소')
  await expect(page.locator('.live-place-card .place-photo img')).toHaveCount(0)
  await page
    .getByRole('button', { name: '검증 장소로 하루 코스 만들기' })
    .click()
  await expect(page).toHaveURL(/#\/plan\//)
})

test('랜딩은 검색 아래 추천 장소를 표시하고 선호도는 MY에서 설정한다', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q')!
    const names = [
      '에버랜드',
      '한국민속촌',
      '호암미술관',
      '와우정사',
      '용인농촌테마파크',
      '한택식물원',
    ]
    return route.fulfill({
      json: { ...result(q), places: [place(String(names.indexOf(q) + 1), q)] },
    })
  })
  await page.goto('/#/')
  await expect(page.getByRole('search')).toBeVisible()
  await expect(
    page.locator('.home-recommendations .live-place-card'),
  ).toHaveCount(6)
  const searchBox = await page.getByRole('search').boundingBox()
  const recommendationsBox = await page
    .locator('.home-recommendations')
    .boundingBox()
  expect(recommendationsBox!.y).toBeGreaterThan(
    searchBox!.y + searchBox!.height,
  )
  await expect(
    page.getByRole('region', { name: '취향 기반 추천' }),
  ).toHaveCount(0)
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'MY', exact: true })
    .click()
  await expect(page.getByLabel('카페 관심도', { exact: true })).toBeVisible()
})

test('실제 검색 모드 홈 → 검색 → 지도 마커·상세 → 페이지 이동과 새로고침', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) => {
    const u = new URL(route.request().url())
    return route.fulfill({
      json: result(
        u.searchParams.get('q')!,
        Number(u.searchParams.get('page')),
      ),
    })
  })
  await page.goto('/#/')
  await expect(page).toHaveTitle('용인데이')
  await expect(page.getByRole('search')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('시연 데이터')
  await page.getByLabel('어떤 하루를 보내고 싶으세요?').fill('용인중앙시장')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.locator('.live-place-card')).toContainText(
    '용인중앙시장 검증 장소 1',
  )
  await expect(page.locator('.live-place-card')).toContainText('031-123-4567')
  await expect(
    page.getByRole('link', { name: '카카오맵 상세·운영 정보 확인' }),
  ).toHaveAttribute('href', 'https://place.map.kakao.com/101')
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.getByRole('button', { name: '지도', exact: true }).click()
  await page.locator('.leaflet-marker-icon').click()
  await expect(page.locator('.live-place-card')).toHaveCount(2)
  await page.getByRole('button', { name: '다음 페이지' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('button', { name: '다음 페이지' })).toBeDisabled()
  await expect(page.locator('.live-place-card')).toHaveCount(1)
  await page.reload()
  await expect(page.getByLabel('장소 검색어')).toHaveValue('용인중앙시장')
  await expect(page.locator('.live-place-card')).toContainText('검증 장소 2')
})
test('빈 검색·실패·재시도는 실제 결과만 표시하며 시연값으로 대체하지 않는다', async ({
  page,
}) => {
  let failed = true
  await page.route('**/api/places?*', (route) =>
    failed
      ? route.fulfill({ status: 502, json: { error: '카카오 연결 실패' } })
      : route.fulfill({ json: result('없는장소', 1, true) }),
  )
  await page.goto('/#/places?q=없는장소')
  await expect(page.getByRole('alert')).toContainText('카카오 연결 실패')
  await expect(page.locator('.event-card, .live-place-card')).toHaveCount(0)
  failed = false
  await page.getByRole('button', { name: '다시 검색' }).click()
  await expect(
    page.getByRole('heading', { name: '검색된 장소가 없어요' }),
  ).toBeVisible()
  await expect(page.locator('body')).not.toContainText('시연 데이터')
})
test('빠른 재검색에서 취소된 응답은 최신 결과를 덮어쓰지 않는다', async ({
  page,
}) => {
  let release: (() => void) | undefined
  await page.route('**/api/places?*', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q')!
    if (q === '느린검색')
      await new Promise<void>((resolve) => {
        release = resolve
      })
    await route.fulfill({ json: result(q) }).catch(() => {})
  })
  await page.goto('/#/places?q=느린검색')
  await expect.poll(() => Boolean(release)).toBe(true)
  await page.getByLabel('장소 검색어').fill('빠른검색')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.locator('.live-place-card')).toContainText('빠른검색')
  release?.()
  await expect(page.locator('.live-place-card')).not.toContainText('느린검색')
})

test('실제 장소 선택 → 주변 음식점·카페 → 코스 편집·동선·저장·새로고침', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00+09:00'))
  await page.route('**/api/places?*', (route) =>
    route.fulfill({ json: result('선택장소') }),
  )
  await page.route('**/api/nearby?*', (route) => {
    const u = new URL(route.request().url())
    expect(u.searchParams.get('lat')).toBe('37.25')
    expect(u.searchParams.get('lng')).toBe('127.11')
    const food = u.searchParams.get('category') === 'FD6'
    return route.fulfill({
      json: {
        ...result('근처'),
        places: food
          ? [
              {
                ...place('201', '실제 음식점 A'),
                categoryGroup: 'FD6',
                distanceMeters: 100,
              },
              {
                ...place('202', '실제 음식점 B'),
                categoryGroup: 'FD6',
                location: { lat: 37.251, lng: 127.112 },
                distanceMeters: 200,
              },
            ]
          : [
              {
                ...place('301', '실제 카페 C'),
                categoryGroup: 'CE7',
                location: { lat: 37.252, lng: 127.113 },
                distanceMeters: 300,
              },
            ],
      },
    })
  })
  await page.goto('/#/places?q=선택장소')
  await page.getByRole('button', { name: /로 하루 코스 만들기/ }).click()
  await expect(
    page.getByRole('heading', { name: '나만의 하루 일정 만들기' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('주변 음식점 선택')).toBeVisible()
  await page.getByLabel('방문 날짜', { exact: true }).fill('2026-11-16')
  await page.getByLabel('주변 음식점 선택').selectOption('202')
  await page.getByLabel('선택 장소 체류 시간(분)').fill('180')
  await page.getByLabel('종료 시간').fill('12:00')
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.locator('.stop-card')).toHaveCount(3)
  await expect(page.locator('main')).toContainText('2026-11-16')
  await expect(page.getByRole('alert')).toContainText('종료 시간')
  await expect(page.locator('.stop-card').nth(1)).toContainText('실제 음식점 B')
  await expect(page.locator('.stop-card').nth(2)).toContainText('실제 카페 C')
  await expect(page.locator('body')).not.toContainText('시연 데이터')
  await page.getByRole('button', { name: '실제 카페 C 위로 이동' }).click()
  await expect(page.locator('.stop-card').nth(1)).toContainText('실제 카페 C')
  await page.getByLabel('실제 카페 C 체류 시간(분)').fill('90')
  await page.getByLabel('실제 카페 C 체류 시간(분)').press('Tab')
  await expect(page.locator('.stop-card').nth(1)).toContainText('90분')
  await page.getByRole('link', { name: '조건 바꾸기', exact: true }).click()
  await expect(page.getByLabel('주변 카페 선택')).toHaveValue('301')
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.locator('.stop-card').nth(1)).toContainText('실제 카페 C')
  await expect(page.locator('.stop-card').nth(1)).toContainText('90분')
  await page.getByRole('link', { name: '지도에서 동선 확인하기' }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3)
  await expect(page.getByRole('link', { name: /카카오맵 길찾기/ })).toHaveCount(
    2,
  )
  await expect(
    page.getByRole('link', { name: /카카오맵 길찾기/ }).first(),
  ).toHaveAttribute('href', /\/link\/by\/walk\//)
  await page
    .locator('.place-list-item')
    .filter({ hasText: '실제 카페 C' })
    .click()
  await expect(page.locator('.place-information')).toContainText('실제 카페 C')
  await page.getByRole('button', { name: '뒤로 가기' }).click()
  await page.getByRole('link', { name: '저장 · 공유' }).click()
  await page.getByRole('button', { name: '내 코스에 저장' }).click()
  await page.getByRole('link', { name: '저장한 코스 열기' }).click()
  await page.reload()
  await page.getByRole('link', { name: '코스 열기' }).click()
  await expect(page.locator('.stop-card')).toHaveCount(3)
  await expect(page.locator('.stop-card').nth(1)).toContainText('실제 카페 C')
  await expect(page.locator('.stop-card').nth(1)).toContainText('90분')
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('yongin.courses.v1')!),
  )
  expect(saved[0].isDemo).toBe(false)
  expect(saved[0].settings.date).toBe('2026-11-16')
  expect(
    saved[0].stops.every(
      (stop: { place: { source: { isDemo: boolean } } }) =>
        !stop.place.source.isDemo,
    ),
  ).toBe(true)
  await expect(page.locator('body')).not.toContainText('시연 데이터')
})
test('주변 추천 실패는 생성을 막고, 실제 빈 후보는 가짜 장소 없이 단일 코스로 저장한다', async ({
  page,
}) => {
  let fail = true
  await page.route('**/api/places?*', (route) =>
    route.fulfill({ json: result('선택장소') }),
  )
  await page.route('**/api/nearby?*', (route) =>
    fail
      ? route.fulfill({ status: 502, json: { error: '주변 연결 실패' } })
      : route.fulfill({ json: result('근처', 1, true) }),
  )
  await page.goto('/#/places?q=선택장소')
  await page.getByRole('button', { name: /로 하루 코스 만들기/ }).click()
  await expect(page.getByRole('alert')).toHaveCount(2)
  await expect(
    page.getByRole('button', { name: '이 장소들로 하루 코스 만들기' }),
  ).toBeDisabled()
  fail = false
  await page.getByRole('button', { name: '주변 추천 다시 불러오기' }).click()
  await expect(
    page.getByText('반경 안에 확인된 후보가 없어요.', { exact: false }),
  ).toHaveCount(2)
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.locator('.stop-card')).toHaveCount(1)
  await expect(page.locator('body')).not.toContainText('시연 데이터')
})

test('시간대를 고르고 머무는 시간을 조절한 뒤 일정 수정·저장·공유까지 유지한다', async ({
  page,
}) => {
  await page.route('**/api/places?*', (route) =>
    route.fulfill({
      json: { ...result('시간표'), places: [place('1', '하루 나들이 장소')] },
    }),
  )
  await page.route('**/api/nearby?*', (route) => {
    const food =
      new URL(route.request().url()).searchParams.get('category') === 'FD6'
    return route.fulfill({
      json: {
        ...result('주변'),
        places: [
          {
            ...place(
              food ? '101' : '201',
              food ? '점심 식당' : '쉬어가는 카페',
            ),
            categoryGroup: food ? 'FD6' : 'CE7',
          },
        ],
      },
    })
  })
  await page.goto('/#/places?q=시간표')
  await page.getByRole('button', { name: /로 하루 코스 만들기/ }).click()
  await page.getByLabel('방문 날짜', { exact: true }).fill('2026-11-16')
  await page.getByRole('button', { name: '오전 나들이', exact: true }).click()
  await expect(page.getByLabel('시작 시간', { exact: true })).toHaveValue(
    '09:00',
  )
  await expect(page.getByLabel('종료 시간', { exact: true })).toHaveValue(
    '12:00',
  )
  await page.getByLabel('식사 시간(분)', { exact: true }).fill('45')
  await page.getByLabel('카페 머무는 시간(분)', { exact: true }).fill('30')
  const preview = page.getByRole('region', { name: '하루 시간표 미리보기' })
  await expect(preview).toContainText('15분 더 필요해요')
  await page.getByLabel('선택 장소 체류 시간(분)', { exact: true }).fill('60')
  await expect(preview).toContainText('2시간 15분')
  await expect(preview).toContainText('45분')
  await expect(preview.locator('.day-plan-stops li').last()).toContainText(
    '10:45 — 11:15',
  )
  await page.getByLabel('종료 시간', { exact: true }).fill('08:00')
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.getByRole('alert')).toContainText('시간')
  await page.getByLabel('종료 시간', { exact: true }).fill('12:00')
  await page.setViewportSize({ width: 320, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await preview.screenshot({ path: '.openai/qa/day-plan-preview-320.png' })
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.locator('.stop-card')).toHaveCount(3)
  await expect(page.locator('.stop-card').first()).toContainText(
    '09:00 — 10:00',
  )
  await page.locator('.day-time-editor summary').click()
  await page.getByLabel('시작 시간', { exact: true }).fill('14:00')
  await page.getByLabel('종료 시간', { exact: true }).fill('17:00')
  await page.getByRole('button', { name: '시간표에 반영', exact: true }).click()
  await expect(page.locator('.stop-card').first()).toContainText(
    '14:00 — 15:00',
  )
  await expect(page.locator('.stop-card').last()).toContainText('15:45 — 16:15')
  await page.getByRole('link', { name: '저장 · 공유 ↗', exact: true }).click()
  await page
    .getByRole('button', { name: '내 코스에 저장', exact: true })
    .click()
  await page
    .getByRole('button', { name: '공유 링크 만들기 · 복사', exact: true })
    .click()
  const shared = await page
    .getByLabel('공유 링크', { exact: true })
    .inputValue()
  await page.goto(shared)
  await expect(page.locator('.stop-card').first()).toContainText(
    '14:00 — 15:00',
  )
  await expect(page.locator('.stop-card').last()).toContainText('15:45 — 16:15')
  await page.reload()
  await expect(page.locator('main')).toContainText('2026-11-16')
  await expect(page.locator('.stop-card').last()).toContainText('15:45 — 16:15')
})
