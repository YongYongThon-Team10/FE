import { test, expect } from '@playwright/test'
import { defaultTaste, parseTaste } from '../src/domain/taste'
import {
  parseCrowding,
  parseRecommendations,
  rankCandidates,
} from '../src/domain/personalization'
import type { RecommendationRequest } from '../src/domain/personalization'
import {
  demoTimes,
  mockCrowding,
  mockRecommendations,
} from '../src/data/intelligenceDemo'
import { createTeamBackend } from '../src/services/teamBackend/client'

const input = (): RecommendationRequest => ({
  query: '',
  profile: defaultTaste(),
  center: { lat: 37.2411, lng: 127.1776 },
  radiusMeters: 3000,
  categories: [],
  visitAt: demoTimes[0],
})

test('선호도 데이터는 범위와 허용 키를 검증하고 기본값을 공유하지 않는다', () => {
  const first = defaultTaste()
  first.categoryWeights.cafe = 5
  expect(defaultTaste().categoryWeights.cafe).toBe(3)
  expect(() =>
    parseTaste({
      ...first,
      categoryWeights: { ...first.categoryWeights, cafe: 6 },
    }),
  ).toThrow()
  expect(() => parseTaste({ ...first, cafeFeatures: ['unknown'] })).toThrow()
})

test('카테고리 선호도가 추천 순서에 반영되고 한식 질문은 음식 후보를 제한한다', () => {
  const request = input()
  request.profile.categoryWeights = {
    park: 0,
    food: 0,
    cafe: 5,
    culture: 0,
    sports: 0,
    shopping: 0,
  }
  expect(mockRecommendations(request).items[0].category).toBe('cafe')
  request.query = '한식 맛집'
  expect(mockRecommendations(request).items.map((item) => item.id)).toEqual([
    'demo_food_01',
  ])
})

test('현재 질문과 리뷰 특성이 일치하는 조용한 카페를 먼저 제안한다', () => {
  const request = input()
  request.query = '조용한 카페'
  expect(mockRecommendations(request).items[0].id).toBe('demo_cafe_01')
})

test('별점과 리뷰가 없으면 0점으로 채우지 않고 사용 가능한 신호로 정규화한다', () => {
  const request = input()
  const missing = mockRecommendations(request).items.find(
    (item) => item.id === 'demo_food_03',
  )!
  const ranked = rankCandidates([missing], request)[0]
  expect(ranked.rating).toBeNull()
  expect(ranked.review).toBeNull()
  expect(ranked.score).toBeGreaterThan(0)
  expect(ranked.missingSignals).toEqual(
    expect.arrayContaining(['rating', 'review', 'crowding']),
  )
  request.profile.ratingPriority = 0
  expect(
    mockRecommendations(request).items.find(
      (item) => item.id === 'demo_food_01',
    )?.reasons,
  ).not.toContain('별점과 리뷰 수를 함께 반영했어요.')
})

test('혼잡도는 인원 보존을 검증하고 시연 시간별 갱신과 예측을 제공한다', () => {
  const values = demoTimes.map((at) =>
    parseCrowding(mockCrowding('demo_park_01', at)),
  )
  expect(values.map((result) => result.current.estimatedPeople)).toEqual([
    870, 1000, 1150, 1070,
  ])
  expect(values[0].forecast).toHaveLength(3)
  const invalid = structuredClone(values[0])
  invalid.current.estimatedPeople = 0
  expect(() => parseCrowding(invalid)).toThrow()
})

test('추천 응답의 위험한 링크, 누락 숫자, 중복 ID와 거짓 live 표기를 거부한다', () => {
  const result = mockRecommendations(input())
  expect(parseRecommendations(result).dataMode).toBe('simulation')
  for (const mutate of [
    (r: typeof result) => {
      r.items[0].detailUrl = 'javascript:alert(1)'
    },
    (r: typeof result) => {
      r.items[0].score = Number.NaN
    },
    (r: typeof result) => {
      r.items.push(r.items[0])
    },
    (r: typeof result) => {
      r.dataMode = 'live'
    },
  ]) {
    const copy = structuredClone(result)
    mutate(copy)
    expect(() => parseRecommendations(copy)).toThrow()
  }
})

test('추천과 혼잡도 어댑터는 사용자 조건과 시각을 실제 BE 경로로 전송한다', async () => {
  const sent: { url: string; body: unknown }[] = []
  const backend = createTeamBackend({
    baseUrl: 'https://be.example.test',
    fetcher: async (url, init) => {
      sent.push({ url: String(url), body: JSON.parse(String(init?.body)) })
      return Response.json({ data: {}, error: { code: null, message: null } })
    },
  })
  await backend.personalizedRecommendations(input())
  await backend.estimateCrowding('demo_park_01', demoTimes[0])
  expect(sent[0].url).toBe('https://be.example.test/api/recommendations')
  expect(sent[0].body).toMatchObject({
    profile: { categoryWeights: { cafe: 3 } },
    radiusMeters: 3000,
  })
  expect(sent[1]).toMatchObject({
    url: 'https://be.example.test/api/crowding/estimate',
    body: { at: demoTimes[0] },
  })
  await expect(backend.saveTasteProfile(defaultTaste())).rejects.toMatchObject({
    code: 'SIGN_IN_REQUIRED',
  })
})
