import { test, expect } from '@playwright/test'

test('마이페이지 선호도를 저장하면 추천에 반영되고 새로고침 후에도 유지된다', async ({
  page,
}) => {
  await page.goto('/#/mypage')
  for (const category of ['자연·공원', '음식점', '문화·공연', '운동', '쇼핑'])
    await page
      .getByLabel(`${category} 관심도`, { exact: true })
      .selectOption('0')
  await page.getByLabel('카페 관심도', { exact: true }).selectOption('5')
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
  await expect(page.locator('.mode-badge')).toContainText('시연 모드')
})

test('질문, 주변 추천, 혼잡도 근거와 시뮬레이션 갱신을 확인한다', async ({
  page,
}) => {
  await page.goto('/#/recommendations')
  await page.getByLabel('원하는 하루', { exact: true }).fill('한식 맛집')
  await page
    .getByRole('button', { name: '조건으로 추천받기', exact: true })
    .click()
  await expect(page.locator('.recommendation-card')).toHaveCount(1)
  await expect(page.locator('.recommendation-card')).toContainText(
    '시연 한식마루',
  )
  await page.getByLabel('원하는 하루', { exact: true }).fill('')
  await page
    .getByRole('button', { name: '조건으로 추천받기', exact: true })
    .click()
  const park = page.locator('[data-place-id="demo_park_01"]')
  await expect(park).toContainText('72.5%')
  await park.getByRole('button', { name: '혼잡도 자세히', exact: true }).click()
  await expect(park.getByRole('region', { name: '혼잡도 상세' })).toContainText(
    '870명 / 1,200명',
  )
  await page.getByLabel('시연 기준 시각', { exact: true }).selectOption('2')
  await expect(park.locator('.crowding-status')).toContainText('95.8%')
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
