import { expect, test } from '@playwright/test'

test('게스트가 검색부터 지도·코스 편집·저장까지 하나의 서비스 흐름을 완주한다', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00+09:00'))
  await page.goto('/#/onboarding')
  await page.getByRole('button', { name: '시작하기' }).click()
  await page.getByRole('button', { name: '게스트로 입장' }).click()
  await expect(
    page.getByRole('heading', { name: '오늘, 용인 어디 갈까?' }),
  ).toBeVisible()

  await page
    .getByLabel('어떤 하루를 보내고 싶으세요?')
    .fill('이번 주말 기흥구 아이와 야외')
  await page.getByRole('button', { name: '검색', exact: true }).click()
  await expect(page).toHaveURL(/#\/events$/)
  await expect(page.locator('.event-card')).toHaveCount(1)

  await page.getByRole('button', { name: '지도', exact: true }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1)
  await page
    .locator('.leaflet-marker-icon[title="호수공원 가을 산책마켓"]')
    .click()
  await page
    .locator('.map-preview')
    .getByRole('link', { name: '호수공원 가을 산책마켓', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: '어떤 즐거움이 있나요?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '이 행사로 하루 짜기' }).click()
  await expect(page.getByLabel('방문 날짜')).toHaveValue('2026-11-14')
  await page.getByLabel('아이 나이').fill('7')
  await page.getByLabel('출발지', { exact: true }).fill('기흥역')
  await page.getByRole('button', { name: '일정 만들기' }).click()
  await expect(page.locator('.stop-card')).toHaveCount(5)

  await page
    .locator('.stop-card')
    .nth(2)
    .getByRole('link', { name: '교체' })
    .click()
  await page.getByRole('button', { name: /물빛 국수집/ }).click()
  await expect(page.locator('.stop-card').nth(2)).toContainText('물빛 국수집')
  await page.getByRole('button', { name: '물빛 국수집 위로 이동' }).click()
  await expect(page.locator('.stop-card').nth(1)).toContainText('물빛 국수집')
  await page.getByRole('link', { name: '지도에서 동선 확인하기' }).click()
  await page
    .locator('.place-list-item')
    .filter({ hasText: '물빛 국수집' })
    .click()
  await expect(page.locator('.place-information')).toContainText('물빛 국수집')
  await expect(page.locator('.place-information')).toContainText('9,000원')
  await page.getByRole('button', { name: '뒤로 가기' }).click()
  await expect(page.locator('.stop-card').nth(1)).toContainText('물빛 국수집')

  await page.getByRole('link', { name: '저장 · 공유' }).click()
  await page.getByRole('button', { name: '내 코스에 저장' }).click()
  await page.getByRole('button', { name: '공유 링크 만들기' }).click()
  await expect(page.getByLabel('공유 링크', { exact: true })).toHaveValue(
    /#\/shared\?data=/,
  )
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '내 코스' })
    .click()
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '내 코스' })
    .click()
  await page.getByRole('link', { name: '코스 열기' }).click()
  await expect(page.locator('.stop-card').nth(1)).toContainText('물빛 국수집')
})
