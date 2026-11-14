import { expect, test } from '@playwright/test'
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

test('홈 추천은 대표 명소 본체만 표시하고 주차장과 부대시설을 제외한다', async ({
  page,
}) => {
  const names = [
    '에버랜드',
    '한국민속촌',
    '호암미술관',
    '와우정사',
    '용인농촌테마파크',
    '한택식물원',
  ]
  await page.route('**/api/places?*', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q')!
    const index = names.indexOf(q)
    return route.fulfill({
      json: {
        ...result(q),
        places: [
          {
            ...place(`${index + 100}`, `${q} 공영주차장`),
            categoryGroup: 'PK6',
            category: '교통 > 주차장',
          },
          {
            ...place(`${index + 200}`, `${q} 방문자센터`),
            categoryGroup: 'AT4',
          },
          {
            ...place(`${index + 300}`, q),
            categoryGroup:
              q === '와우정사' ? '' : q === '호암미술관' ? 'CT1' : 'AT4',
            category:
              q === '와우정사'
                ? '문화,예술 > 종교 > 불교 > 절,사찰'
                : '여행 > 관광,명소',
          },
        ],
      },
    })
  })
  await page.goto('/#/')
  await expect(page.locator('.live-place-card')).toHaveCount(6)
  for (const name of names)
    await expect(
      page.getByRole('link', { name: `${name} ↗`, exact: true }),
    ).toBeVisible()
  await expect(page.locator('.home-recommendations')).not.toContainText(
    '공영주차장',
  )
  await expect(page.locator('.home-recommendations')).not.toContainText(
    '방문자센터',
  )
  await page
    .getByRole('button', { name: '한국민속촌로 하루 코스 만들기' })
    .click()
  await expect(page).toHaveURL(/#\/plan\//)
  await expect(page.locator('body')).toContainText('한국민속촌')
})

test('명소 검색 일부 실패 시 확인된 명소만 표시하며 모두 실패하면 재시도 안내', async ({
  page,
}) => {
  let allFailed = false
  await page.route('**/api/places?*', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q')!
    return q === '에버랜드' && !allFailed
      ? route.fulfill({ json: { ...result(q), places: [place('10', q)] } })
      : route.fulfill({ status: 502, json: { error: '연결 실패' } })
  })
  await page.goto('/#/')
  await expect(page.locator('.live-place-card')).toHaveCount(1)
  await expect(page.locator('.live-place-card')).toContainText('에버랜드')
  allFailed = true
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    '대표 명소 정보를 불러오지 못했어요',
  )
  await expect(page.locator('.live-place-card')).toHaveCount(0)
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
  await expect(
    page.getByRole('heading', { name: '처음이라면, 용인 대표 명소' }),
  ).toBeVisible()
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
    page.getByRole('heading', { name: '실제 장소로 하루를 연결해요' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('주변 음식점 선택')).toBeVisible()
  await page.getByLabel('주변 음식점 선택').selectOption('202')
  await page.getByLabel('선택 장소 체류 시간(분)').fill('180')
  await page.getByLabel('종료 시간').fill('12:00')
  await page
    .getByRole('button', { name: '이 장소들로 하루 코스 만들기' })
    .click()
  await expect(page.locator('.stop-card')).toHaveCount(3)
  await expect(page.getByRole('alert')).toContainText('종료 시간')
  await expect(page.locator('.stop-card').nth(1)).toContainText('실제 음식점 B')
  await expect(page.locator('.stop-card').nth(2)).toContainText('실제 카페 C')
  await expect(page.locator('body')).not.toContainText('시연 데이터')
  await page.getByRole('button', { name: '실제 카페 C 위로 이동' }).click()
  await expect(page.locator('.stop-card').nth(1)).toContainText('실제 카페 C')
  await page.getByLabel('실제 카페 C 체류 시간(분)').fill('90')
  await page.getByLabel('실제 카페 C 체류 시간(분)').press('Tab')
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
