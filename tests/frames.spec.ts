import { test, expect } from '@playwright/test'
import { designFrames, frameLink } from '../src/data/designFrames'
import { occupancyStatus, parseFacilityCatalog } from '../src/domain/facilities'
import { facilityDemo } from '../src/data/facilities'

test('전수 목록의 50개 프레임은 실제 화면·상태로 열리며 기존 보관 데이터를 바꾸지 않는다', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+09:00'))
  await page.goto('/#/design-review')
  await expect(page.locator('[data-frame-id]')).toHaveCount(50)
  await page.evaluate(() =>
    localStorage.setItem('yongin.courses.v1', JSON.stringify([])),
  )
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    for (const frame of designFrames) {
      await page.goto('/#' + frameLink(frame))
      await page.evaluate(() => document.fonts.ready)
      if (frame.id === '205:260')
        await expect(
          page.getByRole('region', { name: '장소 위치 지도' }),
        ).toBeVisible()
      await expect(page.locator('body')).not.toContainText(
        '요청한 화면을 찾을 수 없어요.',
      )
      await expect(page.locator('body')).not.toContainText(
        '이 브라우저에 저장된 코스가 없어요.',
      )
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
      expect(overflow, width + 'px ' + frame.id + ' ' + frame.name).toBe(false)
      const broken = await page.locator('img').evaluateAll(async (images) => {
        await Promise.all(
          images.map((i) => {
            i.loading = 'eager'
            return i.decode().catch(() => null)
          }),
        )
        return images.filter((i) => i.naturalWidth === 0).map((i) => i.src)
      })
      expect(broken, frame.id + ' assets').toEqual([])
      expect(
        await page.evaluate(() => localStorage.getItem('yongin.courses.v1')),
      ).toBe('[]')
    }
  }
})
test('월간 캘린더는 선택 날짜의 행사·코스를 표시하고 월 경계로 이동한다', async ({
  page,
}) => {
  await page.goto('/#/calendar?frame=308%3A4316')
  await expect(page.getByRole('heading', { name: '2026년 11월' })).toBeVisible()
  await page.getByRole('button', { name: '2026-11-14 일정 보기' }).click()
  await expect(
    page.getByRole('link', { name: '내 코스 호수공원 중심 하루' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '다음 달' }).click()
  await expect(page.getByRole('heading', { name: '2026년 12월' })).toBeVisible()
  await page.getByRole('button', { name: '2026-12-01 일정 보기' }).click()
  await expect(page.getByText('이 날짜에 등록된 일정이 없어요.')).toBeVisible()
})
test('시연 계정 → 로그인 정보 → 로그아웃 확인·취소·완료', async ({ page }) => {
  await page.goto('/#/login')
  await page.getByRole('button', { name: '시연 계정으로 둘러보기' }).click()
  await page.getByRole('link', { name: '설정', exact: true }).click()
  await page.getByRole('link', { name: '계정 정보 보기' }).click()
  await expect(
    page.getByRole('definition').filter({ hasText: 'traveler@example.com' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '뒤로 가기' }).click()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('로그아웃할까요?')
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '로그아웃', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: '다시 만나요!' }),
  ).toBeVisible()
  await page.getByRole('link', { name: '로그인 없이 둘러보기' }).click()
  await expect(
    page.getByRole('heading', { name: '오늘, 용인 어디 갈까?' }),
  ).toBeVisible()
})
test('시연 문의 완료와 탈퇴 확인은 실제 전송 없이 동작한다', async ({
  page,
}) => {
  await page.goto('/#/login')
  await page.getByRole('button', { name: '시연 계정으로 둘러보기' }).click()
  await page.goto('/#/contact')
  await page.getByLabel('제목', { exact: true }).fill('코스 보관 문의')
  await page
    .getByLabel('문의 내용', { exact: true })
    .fill('저장한 코스를 확인하고 싶어요.')
  await page.getByRole('button', { name: '문의 보내기' }).click()
  await expect(
    page.getByRole('heading', { name: '문의를 잘 받았어요' }),
  ).toBeVisible()
  await expect(
    page.getByText('실제 문의는 전송되지 않았어요.', { exact: false }),
  ).toBeVisible()
  await page.goto('/#/privacy')
  await page.getByRole('button', { name: '회원 탈퇴', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('삭제되는 정보')
  await page.getByRole('button', { name: '계속 이용하기' }).click()
  await page.getByRole('button', { name: '회원 탈퇴', exact: true }).click()
  await page.getByRole('button', { name: '탈퇴하기', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '게스트로 입장' }),
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('yongin.courses.v1')!),
    ),
  ).toEqual([])
})
test('시설 검색·필터 → 이용 현황 → 주차 → 연결 행사와 정보 미제공·빈 결과', async ({
  page,
}) => {
  await page.goto('/#/facilities/search')
  await page.getByLabel('시설명 또는 동 이름', { exact: true }).fill('구갈동')
  await page.getByRole('button', { name: '구갈동 검색하기' }).click()
  await expect(page.locator('.facility-card')).toHaveCount(2)
  await page.getByRole('link', { name: '필터', exact: true }).click()
  await page.getByRole('button', { name: '수영장', exact: true }).click()
  await page.getByRole('button', { name: '결과 1곳 보기' }).click()
  await page.locator('.facility-card').click()
  await page.getByRole('link', { name: '이용 현황과 판정 기준 보기' }).click()
  await expect(page.locator('.metric')).toHaveText('35%')
  await page.getByRole('link', { name: '기흥 생활수영장으로 돌아가기' }).click()
  await page.getByRole('link', { name: '주차 정보 상세' }).click()
  await expect(page.locator('.metric')).toHaveText('18면')
  await page.getByRole('button', { name: '공식 확인', exact: false }).click()
  await expect(page.getByRole('dialog')).toContainText(
    '외부 공식 페이지와 연결되지 않았습니다.',
  )
  await page.getByRole('button', { name: '확인했어요' }).click()
  await page.goto('/#/facilities/events')
  await page.getByRole('link', { name: '행사 상세 보기' }).first().click()
  await expect(
    page.getByRole('heading', { name: '주말 수영 체험 교실' }),
  ).toBeVisible()
  await page.goto('/#/facilities/detail/gym-unknown')
  await expect(
    page.getByText('이용 현황 미제공', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.metric')).toHaveCount(0)
  await page.goto('/#/facilities/results?q=테니스장&cat=운동·체육')
  await expect(
    page.getByRole('heading', { name: '조건에 맞는 시설을 찾지 못했어요' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '필터 초기화' }).click()
  await expect(page.getByLabel('시설 검색 결과 검색어')).toHaveValue('테니스장')
  await page.getByRole('link', { name: '조건 없이 전체 시설 보기' }).click()
  await expect(page.locator('.facility-card')).toHaveCount(8)
})
test('관측 정보가 없을 때 0명·여유로 해석하지 않고 잘못된 수치를 거부한다', () => {
  expect(
    occupancyStatus(facilityDemo.items.find((f) => f.id === 'gym-unknown')!),
  ).toBe('정보 없음')
  expect(occupancyStatus(facilityDemo.items[0])).toBe('여유')
  expect(() =>
    parseFacilityCatalog({
      ...facilityDemo,
      items: [
        {
          ...facilityDemo.items[0],
          occupancy: {
            current: 0,
            capacity: 0,
            observedAt: '2026-11-12',
            updatedAt: '2026-11-12',
          },
        },
      ],
    }),
  ).toThrow()
})
