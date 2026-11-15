import type {
  CrowdingEstimate,
  RecommendationCandidate,
  RecommendationRequest,
  RecommendationResponse,
} from '../domain/personalization'
import { distanceBetween, rankCandidates } from '../domain/personalization'

export const demoTimes = [10, 20, 30, 40].map(
  (minute) => `2026-11-21T14:${minute}:00+09:00`,
)
const crowdingProfiles = {
  demo_park_01: {
    capacity: 1200,
    initial: 800,
    inflow: [250, 320, 360, 180, 130, 100, 80],
    outflow: [180, 190, 210, 260, 240, 220, 200],
  },
  demo_garden_01: {
    capacity: 800,
    initial: 180,
    inflow: [80, 90, 100, 50, 40, 30, 20],
    outflow: [40, 40, 40, 55, 60, 60, 55],
  },
  demo_attraction_01: {
    capacity: 1000,
    initial: 600,
    inflow: [190, 260, 330, 120, 90, 65, 40],
    outflow: [120, 130, 140, 220, 230, 210, 180],
  },
} as const
export function mockCrowding(placeId: string, at: string): CrowdingEstimate {
  if (!Object.hasOwn(crowdingProfiles, placeId))
    throw new Error('시연 혼잡도 장소를 찾지 못했어요.')
  const start = demoTimes.findIndex(
    (time) => Date.parse(time) === Date.parse(at),
  )
  if (start < 0) throw new Error('지원하는 시연 시각을 선택해 주세요.')
  const profile = crowdingProfiles[placeId as keyof typeof crowdingProfiles]
  let previous = Number(profile.initial)
  const windows = profile.inflow
    .map((inflow, index) => {
      const people = previous + inflow - profile.outflow[index]
      const ratio = (people / profile.capacity) * 100
      const level =
        ratio < 40
          ? 'relaxed'
          : ratio < 65
            ? 'normal'
            : ratio < 85
              ? 'slightly_busy'
              : 'busy'
      const label =
        ratio < 40
          ? '여유 예상'
          : ratio < 65
            ? '보통 예상'
            : ratio < 85
              ? '약간 붐빔 예상'
              : '붐빔 예상'
      const window = {
        at: new Date(Date.parse(demoTimes[0]) + index * 600000).toISOString(),
        previousPeople: previous,
        inflowPeople: inflow,
        outflowPeople: profile.outflow[index],
        estimatedPeople: people,
        occupancyPercent: Math.round(ratio * 10) / 10,
        level,
        label,
      } as CrowdingEstimate['current']
      previous = people
      return window
    })
    .slice(start, start + 4)
  return {
    placeId,
    dataMode: 'simulation',
    predictionSource: 'scenario_mock',
    asOf: at,
    generatedAt: new Date().toISOString(),
    confidence: 'low',
    capacity: { people: profile.capacity, basis: 'mock_comfort_capacity' },
    current: windows[0],
    forecast: windows.slice(1),
    warnings: [
      {
        code: 'SIMULATION_DATA',
        message:
          '수용인원, 방문객과 행사 유입은 시연용 값이며 AI를 호출하지 않았어요.',
      },
    ],
  }
}
type Seed = Pick<
  RecommendationCandidate,
  'id' | 'name' | 'category' | 'location' | 'tags' | 'crowdingPlaceId'
> & {
  ratingValue: number | null
  ratingCount: number
  reviewSummary: string | null
  reviewTags: string[]
}
const seeds: Seed[] = [
  {
    id: 'demo_park_01',
    name: '시연 호수공원',
    category: 'park',
    location: { lat: 37.244, lng: 127.18 },
    tags: ['view', 'spacious'],
    crowdingPlaceId: 'demo_park_01',
    ratingValue: 4.5,
    ratingCount: 210,
    reviewSummary: '산책과 전망을 즐긴다는 시연 리뷰예요.',
    reviewTags: ['view', 'spacious'],
  },
  {
    id: 'demo_garden_01',
    name: '시연 수목원',
    category: 'park',
    location: { lat: 37.249, lng: 127.183 },
    tags: ['quiet'],
    crowdingPlaceId: 'demo_garden_01',
    ratingValue: 4.6,
    ratingCount: 160,
    reviewSummary: '조용한 산책길이라는 시연 리뷰예요.',
    reviewTags: ['quiet', 'view'],
  },
  {
    id: 'demo_attraction_01',
    name: '시연 문화관광지',
    category: 'culture',
    location: { lat: 37.247, lng: 127.174 },
    tags: ['culture'],
    crowdingPlaceId: 'demo_attraction_01',
    ratingValue: 4.4,
    ratingCount: 110,
    reviewSummary: '야외공연을 즐겼다는 시연 리뷰예요.',
    reviewTags: ['spacious'],
  },
  {
    id: 'demo_food_01',
    name: '시연 한식마루',
    category: 'food',
    location: { lat: 37.242, lng: 127.177 },
    tags: ['korean'],
    crowdingPlaceId: null,
    ratingValue: 4.5,
    ratingCount: 180,
    reviewSummary: '한식 메뉴와 넓은 좌석에 관한 시연 리뷰예요.',
    reviewTags: ['korean', 'spacious'],
  },
  {
    id: 'demo_food_02',
    name: '시연 작은파스타',
    category: 'food',
    location: { lat: 37.243, lng: 127.179 },
    tags: ['western'],
    crowdingPlaceId: null,
    ratingValue: 4.8,
    ratingCount: 8,
    reviewSummary: '양식과 조용한 분위기에 관한 시연 리뷰예요.',
    reviewTags: ['western', 'quiet'],
  },
  {
    id: 'demo_food_03',
    name: '시연 초록식탁',
    category: 'food',
    location: { lat: 37.245, lng: 127.176 },
    tags: ['light', 'japanese'],
    crowdingPlaceId: null,
    ratingValue: null,
    ratingCount: 0,
    reviewSummary: null,
    reviewTags: [],
  },
  {
    id: 'demo_cafe_01',
    name: '시연 고요카페',
    category: 'cafe',
    location: { lat: 37.242, lng: 127.178 },
    tags: ['quiet', 'spacious'],
    crowdingPlaceId: null,
    ratingValue: 4.4,
    ratingCount: 220,
    reviewSummary: '조용하고 공간이 넓다는 시연 리뷰예요.',
    reviewTags: ['quiet', 'spacious'],
  },
  {
    id: 'demo_cafe_02',
    name: '시연 디저트정원',
    category: 'cafe',
    location: { lat: 37.246, lng: 127.181 },
    tags: ['dessert', 'view'],
    crowdingPlaceId: null,
    ratingValue: 4.7,
    ratingCount: 65,
    reviewSummary: '디저트와 전망을 선호한다는 시연 리뷰예요.',
    reviewTags: ['dessert', 'view'],
  },
  {
    id: 'demo_sports_01',
    name: '시연 가벼운운동장',
    category: 'sports',
    location: { lat: 37.245, lng: 127.172 },
    tags: ['spacious'],
    crowdingPlaceId: null,
    ratingValue: null,
    ratingCount: 0,
    reviewSummary: null,
    reviewTags: [],
  },
  {
    id: 'demo_shopping_01',
    name: '시연 공예상점',
    category: 'shopping',
    location: { lat: 37.243, lng: 127.175 },
    tags: ['shopping'],
    crowdingPlaceId: null,
    ratingValue: 4.3,
    ratingCount: 40,
    reviewSummary: '공예 상품에 관한 시연 리뷰예요.',
    reviewTags: ['shopping'],
  },
]
export function mockRecommendations(
  request: RecommendationRequest,
): RecommendationResponse {
  const candidates: RecommendationCandidate[] = seeds.map((seed) => ({
    id: seed.id,
    name: seed.name,
    category: seed.category,
    location: seed.location,
    address: '용인 지역 시연용 가상 장소',
    detailUrl: null,
    tags: seed.tags,
    distanceMeters: distanceBetween(request.center, seed.location),
    crowdingPlaceId: seed.crowdingPlaceId,
    rating:
      seed.ratingValue === null
        ? null
        : {
            value: seed.ratingValue,
            count: seed.ratingCount,
            source: '시연 별점',
            asOf: request.visitAt,
          },
    review:
      seed.reviewSummary === null
        ? null
        : {
            summary: seed.reviewSummary,
            tags: seed.reviewTags,
            source: '시연 리뷰',
            asOf: request.visitAt,
          },
    source: {
      name: '시연 장소 데이터',
      dataMode: 'simulation',
      fetchedAt: request.visitAt,
    },
    crowding: seed.crowdingPlaceId
      ? mockCrowding(seed.crowdingPlaceId, request.visitAt)
      : null,
  }))
  // 영상 재현용 AI 판단 예시. 실제 OpenAI 결과로 표시하지 않는다.
  const adjustments = {
    demo_park_01: 1,
    demo_garden_01: 2,
    demo_attraction_01: 1,
    demo_food_01: 2,
    demo_food_02: 1,
    demo_cafe_01: 2,
    demo_cafe_02: 1,
  }
  return {
    dataMode: 'simulation',
    queryMethod: request.query.trim() ? 'scenario_mock' : 'none',
    rankingMethod: 'scenario_mock',
    generatedAt: new Date().toISOString(),
    sourceAsOf: request.visitAt,
    refreshAfterSeconds: 30,
    items: rankCandidates(candidates, request, adjustments),
    warnings: [
      '장소, 별점, 리뷰, 공공데이터 입력과 AI 판단은 모두 시연용 예시예요. 실제 OpenAI를 호출하지 않아요.',
    ],
  }
}
