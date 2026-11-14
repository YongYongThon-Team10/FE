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
  await expect(
    page.getByRole('heading', { name: '용인에서 가볼 만한 곳' }),
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
