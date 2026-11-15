import { test, expect } from '@playwright/test'

test('MY는 로그인된 프로필을 보여주고 개인정보와 기존 내 코스를 연결한다', async ({
  page,
}) => {
  await page.goto('/#/')
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  await expect(
    nav.getByRole('link', { name: '화면 흐름', exact: true }),
  ).toHaveCount(0)
  await nav.getByRole('link', { name: 'MY', exact: true }).click()
  await expect(page).toHaveURL(/#\/mypage$/)
  await expect(
    nav.getByRole('link', { name: 'MY', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('region', { name: '내 프로필' })).toContainText(
    '남곽춘님',
  )
  await expect(
    page.getByRole('link', { name: '로그인하기', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: '회원가입', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: '개인정보 관리' }).click()
  await expect(
    page.getByRole('switch', { name: '위치 정보 이용' }),
  ).toBeVisible()
  await expect(
    nav.getByRole('link', { name: 'MY', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await nav.getByRole('link', { name: '내 코스', exact: true }).click()
  await expect(page).toHaveURL(/#\/saved$/)
  await expect(
    nav.getByRole('link', { name: '내 코스', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('마이페이지 선호도를 저장하면 추천에 반영되고 새로고침 후에도 유지된다', async ({
  page,
}) => {
  await page.goto('/#/mypage')
  await expect(page.locator('.interest-panel').getByRole('slider')).toHaveCount(
    6,
  )
  for (const category of ['자연·공원', '음식점', '문화·공연', '운동', '쇼핑'])
    await page.getByLabel(`${category} 관심도`, { exact: true }).press('Home')
  await page.getByLabel('카페 관심도', { exact: true }).press('End')
  await expect(
    page
      .locator('.interest-row')
      .filter({ has: page.getByLabel('카페 관심도', { exact: true }) })
      .locator('output'),
  ).toHaveText('5')
  await page.getByRole('button', { name: '조용한 분위기', exact: true }).click()
  await page.getByRole('button', { name: '선호도 저장', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('선호도를 저장했어요')
  await page.reload()
  await expect(page.getByLabel('카페 관심도', { exact: true })).toHaveValue('5')
  await expect(
    page.getByRole('button', { name: '조용한 분위기', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: '맞춤 추천 보기', exact: true }).click()
  await expect(page.locator('.recommendation-card').first()).toContainText(
    '시연 고요카페',
  )
  await expect(page.locator('.recommendation-result-caption')).toContainText(
    '예시 장소',
  )
})

test('사용자는 간단히 추천받고 혼잡도와 주변 장소를 확인한다', async ({
  page,
}) => {
  await page.goto('/#/recommendations')
  await page.getByLabel('원하는 하루', { exact: true }).fill('한식 맛집')
  await page.getByRole('button', { name: '추천받기', exact: true }).click()
  await expect(page.locator('.recommendation-card')).toHaveCount(1)
  await expect(page.locator('.recommendation-card')).toContainText(
    '시연 한식마루',
  )
  await page.getByLabel('원하는 하루', { exact: true }).fill('')
  await page.getByRole('button', { name: '추천받기', exact: true }).click()
  const park = page.locator('[data-place-id="demo_park_01"]')
  await expect(page.getByRole('meter')).toHaveCount(0)
  const trigger = park.getByRole('button', { name: /혼잡도: 약간 붐빔/ })
  await expect(trigger).toHaveText('약간 붐빔')
  await trigger.click()
  const panel = page.getByRole('dialog', { name: '혼잡도 상세' })
  await expect(panel).toContainText('72.5%')
  await expect(panel.getByRole('meter')).toHaveAttribute(
    'aria-valuenow',
    '72.5',
  )
  await panel.getByText('시간대별 혼잡도 보기', { exact: true }).click()
  await expect(panel.locator('.crowding-forecast li')).toHaveCount(3)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByLabel('시연 기준 시각', { exact: true })).toHaveCount(
    0,
  )
  await expect(page.getByRole('button', { name: /시연 재생/ })).toHaveCount(0)
  await expect(page.locator('.recommendation-score')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('초 간격')
  await expect(page.locator('body')).not.toContainText('BE API 연결')
  await expect(page.locator('.recommendation-filters')).not.toHaveAttribute(
    'open',
    '',
  )
  await park
    .getByRole('link', { name: '주변 맛집과 카페', exact: true })
    .click()
  await expect(page.getByLabel('추천 유형', { exact: true })).toHaveValue(
    'nearby',
  )
  await expect(page.locator('.recommendation-card')).toHaveCount(5)
})

test('추천과 마이페이지는 작은 화면에서 가로 넘침이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  for (const route of ['mypage', 'recommendations']) {
    await page.goto(`/#/${route}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy()
  }
  await page.screenshot({
    path: '.openai/qa/personalized-320.png',
    fullPage: true,
  })
})

test('메인과 행사 상세는 상태 버튼만 표시하고 혼잡도는 하단 패널에서 확인한다', async ({
  page,
}) => {
  await page.goto('/#/')
  const card = page.locator('.event-card').first()
  const trigger = card.locator('.badges .crowding-trigger')
  await expect(trigger).toHaveText(/^(여유|보통|약간 붐빔|혼잡)$/)
  const status = await trigger.textContent()
  await expect(page.locator('main .crowding-status')).toHaveCount(0)
  await trigger.click()
  const panel = page.getByRole('dialog', { name: '혼잡도 상세' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('meter')).toBeVisible()
  await panel.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(trigger).toBeFocused()
  await card
    .getByRole('link', { name: '호수공원 가을 산책마켓', exact: true })
    .click()
  await expect(page.locator('main .badges .crowding-trigger')).toHaveText(
    status!,
  )
  await expect(
    page.getByRole('heading', { name: '방문 전 확인해 주세요' }),
  ).toBeVisible()
  await expect(page.locator('main .crowding-status')).toHaveCount(0)
})
