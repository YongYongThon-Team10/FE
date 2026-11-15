import { expect, test } from '@playwright/test'
import {
  weekDates,
  filterEvents,
  makeDemoCourse,
  recalculate,
  schedule,
} from '../src/domain/planning'
import { emptyFilters } from '../src/domain/models'
import type { CourseSettings } from '../src/domain/models'
import { demoCatalog } from '../src/data/demo'
import { parseCatalog, parseCourse } from '../src/domain/validation'

test('달력은 서울 시간 기준 일~토와 월·연도 경계를 계산한다', () => {
  expect(weekDates('2026-11-12')).toEqual([
    '2026-11-08',
    '2026-11-09',
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
  ])
  expect(weekDates('2027-01-01')).toEqual([
    '2026-12-27',
    '2026-12-28',
    '2026-12-29',
    '2026-12-30',
    '2026-12-31',
    '2027-01-01',
    '2027-01-02',
  ])
  expect(weekDates('2026-11-12', 1)[0]).toBe('2026-11-15')
})
test('무료만·지역·날짜 조건은 같은 결과 집합에 적용된다', () => {
  expect(
    filterEvents(demoCatalog.events, {
      ...emptyFilters,
      freeOnly: true,
      districts: ['기흥구'],
      date: '2026-11-14',
    }).map((e) => e.id),
  ).toEqual(['lake-market', 'museum-festival'])
  expect(
    filterEvents(demoCatalog.events, { ...emptyFilters, date: '2026-11-16' }),
  ).toEqual([])
  expect(
    filterEvents([{ ...demoCatalog.events[0], price: null }], {
      ...emptyFilters,
      freeOnly: true,
    }),
  ).toEqual([])
})
test('응답 검증은 좌표 오류·중복 ID·잘못된 공유 형식을 거부한다', () => {
  expect(parseCatalog(demoCatalog).events).toHaveLength(5)
  expect(() =>
    parseCatalog({
      ...demoCatalog,
      events: [demoCatalog.events[0], demoCatalog.events[0]],
    }),
  ).toThrow('중복')
  expect(() =>
    parseCatalog({
      ...demoCatalog,
      places: [{ ...demoCatalog.places[0], location: { lat: 200, lng: 127 } }],
    }),
  ).toThrow()
  expect(() => parseCourse({ id: 'invalid' })).toThrow()
})
test('일정 생성은 5칸을 유지하고 무료 후보가 없으면 식사 칸을 비운다', () => {
  const settings: CourseSettings = {
    date: '2026-11-14',
    companion: '아이와',
    childAge: 7,
    transport: '도보',
    origin: '기흥역',
    originLocation: null,
    startTime: '10:00',
    endTime: '17:00',
    budget: 0,
    activities: ['먹거리', '체험'],
  }
  const course = makeDemoCourse(demoCatalog.events[0], demoCatalog, settings)
  expect(parseCourse(course).stops.map((s) => s.kind)).toEqual([
    'arrival',
    'program',
    'meal',
    'nearby',
    'return',
  ])
  expect(course.stops.find((s) => s.kind === 'meal')?.place).toBeNull()
  expect(course.stops.find((s) => s.kind === 'meal')?.missingReason).toContain(
    '직접 추가',
  )
  const edited = recalculate({
    ...course,
    stops: course.stops.map((s, i) =>
      i === 0 ? { ...s, durationMinutes: 600 } : s,
    ),
  })
  expect(schedule(edited).some((s) => s.overflows)).toBe(true)
  expect(edited.stops[0].durationMinutes).toBe(600)
})
test('검색 전용 홈의 디자인과 빈 검색 복구', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+09:00'))
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: '용인데이' })).toHaveCount(1)
  await page.evaluate(() => document.fonts.ready)
  expect(
    await page
      .getByRole('heading', { level: 1 })
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Gugi')
  expect(
    await page
      .locator('body')
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Noto Sans KR')
  expect(
    await page
      .locator('.home-banner')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain('linear-gradient')
  await expect(page.locator('.filter-panel')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: '조건으로 검색하기' }),
  ).toHaveCount(0)
  await page.getByLabel('어떤 하루를 보내고 싶으세요?').fill('존재하지않는행사')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.getByText('조건에 맞는 행사가 없어요')).toBeVisible()
  await page.getByRole('button', { name: '조건 초기화' }).click()
  await expect(page.locator('.event-card')).toHaveCount(5)
})

test('문장 검색은 바로 결과로 이동하고 결과에서 지역·무료 조건을 수정한다', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+09:00'))
  await page.goto('/#/')
  await page
    .getByLabel('어떤 하루를 보내고 싶으세요?')
    .fill('이번 주말 기흥구 아이랑 무료 야외')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page).toHaveURL(/#\/events$/)
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page.locator('.filter-details summary').click()
  await expect(
    page.getByRole('button', { name: '기흥구', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '기흥구', exact: true }).click()
  await page.getByRole('button', { name: '수지구', exact: true }).click()
  await page.getByRole('button', { name: '야외', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(2)
  await expect(page.locator('.event-card').first()).toContainText(
    '우리 동네 가을 음악회',
  )
})

test('위치 허용 시 귀가 링크를 만들고 현재 좌표는 저장하지 않는다', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 37.275, longitude: 127.116 })
  await page.goto('/#/configure/lake-market')
  await page.getByRole('button', { name: '내 위치' }).click()
  await expect(page.getByLabel('출발지', { exact: true })).toHaveValue(
    '현재 위치',
  )
  await page.getByLabel('아이 나이').fill('7')
  await page.getByRole('button', { name: '일정 만들기' }).click()
  await expect(
    page.getByRole('link', { name: '카카오맵 귀가 길찾기' }),
  ).toHaveAttribute('href', /\/link\/by\/car\//)
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('yongin.draft.v1')!),
  )
  expect(stored.settings.originLocation).toBeNull()
})
test('마커 미리보기와 출처 차이 보기', async ({ page }) => {
  await page.goto('/#/map')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5)
  await page
    .locator('.leaflet-marker-icon[title="호수공원 가을 산책마켓"]')
    .click()
  await expect(
    page
      .locator('.map-preview')
      .getByRole('heading', { name: '호수공원 가을 산책마켓' }),
  ).toBeVisible()
  await page
    .locator('.map-preview')
    .getByRole('button', { name: '안내 상이' })
    .click()
  await expect(
    page.getByRole('heading', { name: '출처마다 안내가 달라요' }),
  ).toBeVisible()
  await expect(page.getByText('시연 안내 A')).toBeVisible()
  await expect(page.getByText('시연 안내 B')).toBeVisible()
})
test('생성→직접 입력→순서 수정→저장→새로고침→공유→다른 세션 열기', async ({
  page,
  browser,
}) => {
  await page.goto('/#/events/lake-market')
  await page.getByRole('button', { name: '이 행사로 하루 짜기' }).click()
  await page.getByLabel('출발지', { exact: true }).fill('기흥역')
  await page.getByLabel('아이 나이').fill('7')
  await page.getByRole('button', { name: '일정 만들기' }).click()
  await expect(page.locator('.stop-card')).toHaveCount(5)
  expect(
    (
      await page
        .getByRole('heading', { name: '추천 하루 일정', exact: true })
        .boundingBox()
    )?.y,
  ).toBeGreaterThanOrEqual(62)
  await page
    .locator('.stop-card')
    .nth(2)
    .getByRole('link', { name: '직접 입력' })
    .click()
  await page.getByLabel('장소 이름').fill('직접 정한 점심 장소')
  await page.getByRole('button', { name: '코스에 반영' }).click()
  await expect(page.locator('.stop-card').nth(2)).toContainText(
    '직접 정한 점심 장소',
  )
  await page
    .getByRole('button', { name: '직접 정한 점심 장소 위로 이동' })
    .click()
  await expect(page.locator('.stop-card').nth(1)).toContainText(
    '직접 정한 점심 장소',
  )
  await page.getByRole('link', { name: '저장 · 공유' }).click()
  await page.getByRole('button', { name: '내 코스에 저장' }).click()
  await expect(page.locator('.toast')).toContainText('저장했어요')
  await page.getByRole('button', { name: '공유 링크 만들기' }).click()
  const link = await page.getByLabel('공유 링크', { exact: true }).inputValue()
  expect(link).not.toContain('기흥역')
  const payload = JSON.parse(
    Buffer.from(
      new URLSearchParams(link.split('?')[1]).get('data')!,
      'base64',
    ).toString('utf8'),
  )
  expect(payload.settings.origin).toBe('')
  expect(payload.settings.originLocation).toBeNull()
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '내 코스' })
    .click()
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '내 코스' })
    .click()
  await page.reload()
  await expect(page.getByRole('link', { name: '코스 열기' })).toBeVisible()
  const fresh = await browser.newPage()
  await fresh.goto(link)
  await expect(
    fresh.getByRole('heading', { name: '추천 하루 일정', exact: true }),
  ).toBeVisible()
  await expect(fresh.locator('.stop-card')).toHaveCount(5)
  await fresh.close()
})
test('위치 권한 거부는 직접 입력을 안내한다', async ({ page, context }) => {
  await context.clearPermissions()
  await page.goto('/#/configure/lake-market')
  await page.getByRole('button', { name: '내 위치' }).click()
  await expect(page.getByRole('alert')).toContainText('직접 입력')
  await expect(page.getByLabel('출발지', { exact: true })).toBeFocused()
})
test('320px·390px·데스크톱 화면에 가로 넘침과 깨진 이미지가 없다', async ({
  page,
}) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    for (const route of [
      '/',
      '/events',
      '/events/lake-market',
      '/configure/lake-market',
      '/saved',
      '/settings',
      '/notifications',
      '/privacy',
      '/contact',
      '/login',
      '/guide',
    ]) {
      await page.goto(`/#${route}`)
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px ${route}`,
      ).toBe(true)
      const images = await page
        .locator('img')
        .evaluateAll((elements) =>
          elements
            .filter((i) => i.complete && i.naturalWidth === 0)
            .map((i) => i.src),
        )
      expect(images, `${width}px ${route}`).toEqual([])
    }
  }
})
test('잘못된 공유 링크와 손상된 저장 데이터로 화면이 멈추지 않는다', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('yongin.courses.v1', '{broken')
    localStorage.setItem('yongin.draft.v1', JSON.stringify({ bad: true }))
  })
  await page.goto('/#/saved')
  await expect(page.getByText('아직 저장한 코스가 없어요')).toBeVisible()
  await page.goto('/#/shared?data=invalid')
  await expect(
    page.getByRole('heading', { name: '공유 링크를 확인해 주세요.' }),
  ).toBeVisible()
})

test('새 검색과 전체 보기는 이전 조건을 초기화하고 행사명·문장 키워드를 유지한다', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+09:00'))
  await page.goto('/#/')
  await page
    .getByLabel('어떤 하루를 보내고 싶으세요?')
    .fill('이번 주말 기흥구 아이와 무료 야외')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '행사 찾기' })
    .click()
  await page.getByLabel('어떤 하루를 보내고 싶으세요?').fill('음악회')
  await page.getByLabel('어떤 하루를 보내고 싶으세요?').press('Enter')
  await expect(page.locator('.event-card')).toHaveCount(1)
  await expect(page.locator('.event-card')).toContainText(
    '우리 동네 가을 음악회',
  )
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '행사 찾기' })
    .click()
  await page
    .getByLabel('어떤 하루를 보내고 싶으세요?')
    .fill('이번 주말 무료 호수공원')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(1)
  await expect(page.locator('.event-card')).toContainText(
    '호수공원 가을 산책마켓',
  )
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '행사 찾기' })
    .click()
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(5)
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '행사 찾기' })
    .click()
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(5)
})
