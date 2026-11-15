import { categories } from './models'
import type { Category, Coordinate } from './models'
import { finite, isObject } from './taste'
import type { TasteProfile } from './taste'

export type DataMode = 'simulation' | 'live' | 'mixed'
export type CrowdingWindow = {
  at: string
  previousPeople: number
  inflowPeople: number
  outflowPeople: number
  estimatedPeople: number
  occupancyPercent: number
  level: 'relaxed' | 'normal' | 'slightly_busy' | 'busy'
  label: string
}
export type CrowdingEstimate = {
  placeId: string
  dataMode: DataMode
  predictionSource: 'openai' | 'scenario_mock' | 'rule_fallback'
  asOf: string
  generatedAt: string
  confidence: 'low' | 'medium' | 'high'
  capacity: { people: number; basis: string }
  current: CrowdingWindow
  forecast: CrowdingWindow[]
  warnings: { code: string; message: string }[]
}
export type CrowdingFields = {
  crowdingUnavailable?: boolean
  crowdingPlaceId?: string | null
  crowding?: CrowdingEstimate | null
}
export type RecommendationCandidate = {
  id: string
  name: string
  category: Category
  address: string
  location: Coordinate
  distanceMeters: number | null
  detailUrl: string | null
  tags: string[]
  rating: { value: number; count: number; source: string; asOf: string } | null
  review: {
    summary: string
    tags: string[]
    source: string
    asOf: string
  } | null
  source: { name: string; dataMode: DataMode; fetchedAt: string }
  crowdingPlaceId: string | null
  crowding: CrowdingEstimate | null
}
export type RecommendedItem = RecommendationCandidate & {
  score: number
  aiAdjustment: number
  reasons: string[]
  missingSignals: string[]
}
export type RecommendationRequest = {
  query: string
  profile: TasteProfile
  center: Coordinate
  radiusMeters: number
  categories: Category[]
  visitAt: string
}
export type RecommendationResponse = {
  dataMode: DataMode
  queryMethod: 'openai' | 'scenario_mock' | 'none'
  rankingMethod: 'openai' | 'scenario_mock' | 'rule_fallback'
  generatedAt: string
  sourceAsOf: string
  refreshAfterSeconds: number
  items: RecommendedItem[]
  warnings: string[]
}
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((v) => typeof v === 'string' && v.length <= 2000)
export function safeDetailUrl(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}
export function parseCrowding(value: unknown): CrowdingEstimate {
  const fail = () => {
    throw new Error('혼잡도 응답 형식을 확인해 주세요.')
  }
  if (
    !isObject(value) ||
    !isObject(value.capacity) ||
    !finite(value.capacity.people, 1, 10000000) ||
    !Number.isInteger(value.capacity.people) ||
    typeof value.capacity.basis !== 'string' ||
    typeof value.placeId !== 'string' ||
    !['simulation', 'live', 'mixed'].includes(String(value.dataMode)) ||
    !['openai', 'scenario_mock', 'rule_fallback'].includes(
      String(value.predictionSource),
    ) ||
    !['low', 'medium', 'high'].includes(String(value.confidence)) ||
    !validDate(value.asOf) ||
    !validDate(value.generatedAt) ||
    !Array.isArray(value.forecast) ||
    value.forecast.length !== 3 ||
    !Array.isArray(value.warnings)
  )
    return fail()
  const windows = [value.current, ...value.forecast]
  let previousAt = Date.parse(value.asOf) - 600000
  let previousPeople: number | null = null
  for (const window of windows) {
    if (
      !isObject(window) ||
      !validDate(window.at) ||
      typeof window.label !== 'string' ||
      !['relaxed', 'normal', 'slightly_busy', 'busy'].includes(
        String(window.level),
      ) ||
      ![
        'previousPeople',
        'inflowPeople',
        'outflowPeople',
        'estimatedPeople',
      ].every(
        (key) =>
          finite(window[key], 0, 10000000) && Number.isInteger(window[key]),
      ) ||
      !finite(window.occupancyPercent, 0, 1000000000)
    )
      return fail()
    const people =
      Number(window.previousPeople) +
      Number(window.inflowPeople) -
      Number(window.outflowPeople)
    if (
      Date.parse(window.at) !== previousAt + 600000 ||
      (previousPeople !== null && window.previousPeople !== previousPeople)
    )
      return fail()
    previousAt = Date.parse(window.at)
    previousPeople = people
    const rawPercent = (people / Number(value.capacity.people)) * 100
    const expectedLevel =
      rawPercent < 40
        ? 'relaxed'
        : rawPercent < 65
          ? 'normal'
          : rawPercent < 85
            ? 'slightly_busy'
            : 'busy'
    if (window.level !== expectedLevel) return fail()
    if (
      people !== window.estimatedPeople ||
      Math.abs(
        Number(window.occupancyPercent) -
          (people / Number(value.capacity.people)) * 100,
      ) > 0.051
    )
      return fail()
  }
  if (
    value.warnings.some(
      (w) =>
        !isObject(w) ||
        typeof w.code !== 'string' ||
        typeof w.message !== 'string',
    )
  )
    return fail()
  return value as unknown as CrowdingEstimate
}
export function parseRecommendations(value: unknown): RecommendationResponse {
  const fail = () => {
    throw new Error('추천 응답 형식을 확인해 주세요.')
  }
  if (
    !isObject(value) ||
    !['simulation', 'live', 'mixed'].includes(String(value.dataMode)) ||
    !['openai', 'scenario_mock', 'none'].includes(String(value.queryMethod)) ||
    !['openai', 'scenario_mock', 'rule_fallback'].includes(
      String(value.rankingMethod),
    ) ||
    !validDate(value.generatedAt) ||
    !validDate(value.sourceAsOf) ||
    !finite(value.refreshAfterSeconds, 15, 300) ||
    !Array.isArray(value.items) ||
    value.items.length > 100 ||
    !strings(value.warnings)
  )
    return fail()
  const ids = new Set<string>()
  for (const item of value.items) {
    if (
      !isObject(item) ||
      typeof item.id !== 'string' ||
      ids.has(item.id) ||
      typeof item.name !== 'string' ||
      typeof item.address !== 'string' ||
      !categories.includes(item.category as Category) ||
      !isObject(item.location) ||
      !finite(item.location.lat, -90, 90) ||
      !finite(item.location.lng, -180, 180) ||
      !(
        item.distanceMeters === null || finite(item.distanceMeters, 0, 1000000)
      ) ||
      !safeDetailUrl(item.detailUrl) ||
      !strings(item.tags) ||
      !finite(item.score, 0, 100) ||
      !finite(item.aiAdjustment, -10, 10) ||
      !strings(item.reasons) ||
      !strings(item.missingSignals) ||
      !isObject(item.source) ||
      typeof item.source.name !== 'string' ||
      !validDate(item.source.fetchedAt) ||
      !['simulation', 'live', 'mixed'].includes(String(item.source.dataMode)) ||
      !(
        item.crowdingPlaceId === null ||
        typeof item.crowdingPlaceId === 'string'
      )
    )
      return fail()
    ids.add(item.id)
    if (
      item.rating !== null &&
      (!isObject(item.rating) ||
        !finite(item.rating.value, 0, 5) ||
        !finite(item.rating.count, 0, 100000000) ||
        !Number.isInteger(item.rating.count) ||
        typeof item.rating.source !== 'string' ||
        !validDate(item.rating.asOf))
    )
      return fail()
    if (
      item.review !== null &&
      (!isObject(item.review) ||
        typeof item.review.summary !== 'string' ||
        !strings(item.review.tags) ||
        typeof item.review.source !== 'string' ||
        !validDate(item.review.asOf))
    )
      return fail()
    if (item.crowding !== null) parseCrowding(item.crowding)
    if (
      value.dataMode === 'live' &&
      (item.source.dataMode !== 'live' ||
        (isObject(item.crowding) && item.crowding.dataMode !== 'live'))
    )
      return fail()
  }
  return value as unknown as RecommendationResponse
}
export function distanceBetween(a: Coordinate, b: Coordinate) {
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return Math.round(
    6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h))),
  )
}
export function rankCandidates(
  candidates: RecommendationCandidate[],
  request: RecommendationRequest,
  adjustments: Record<string, number> = {},
): RecommendedItem[] {
  const query = request.query.replace(/\s/g, '')
  const intent: Category[] = []
  if (/맛집|음식|식당|한식|일식|양식|식사/.test(query)) intent.push('food')
  if (/카페|커피|디저트/.test(query)) intent.push('cafe')
  if (/공원|산책|자연|수목원/.test(query)) intent.push('park')
  if (/문화|공연|미술|전시/.test(query)) intent.push('culture')
  const cuisine = ['korean', 'japanese', 'western', 'light'].find((_, i) =>
    query.includes(['한식', '일식', '양식', '가벼운식사'][i]),
  )
  return candidates
    .filter(
      (candidate) =>
        (!request.categories.length ||
          request.categories.includes(candidate.category)) &&
        (!intent.length || intent.includes(candidate.category)) &&
        (!cuisine ||
          candidate.category !== 'food' ||
          candidate.tags.includes(cuisine)) &&
        (candidate.distanceMeters === null ||
          candidate.distanceMeters <= request.radiusMeters),
    )
    .map((candidate) => {
      const desired: string[] =
        candidate.category === 'food'
          ? [...request.profile.cuisines, ...(cuisine ? [cuisine] : [])]
          : candidate.category === 'cafe'
            ? [
                ...request.profile.cafeFeatures,
                ...(/조용|한적/.test(query) ? ['quiet'] : []),
                ...(/디저트/.test(query) ? ['dessert'] : []),
                ...(/전망|뷰/.test(query) ? ['view'] : []),
                ...(/넓/.test(query) ? ['spacious'] : []),
              ]
            : []
      const wanted = [...new Set(desired)]
      const matched = [
        ...new Set(
          candidate.review?.tags.filter((tag) => wanted.includes(tag)) ?? [],
        ),
      ]
      const signals: [number | null, number][] = [
        [(request.profile.categoryWeights[candidate.category] / 5) * 100, 0.4],
        [
          candidate.rating
            ? ((candidate.rating.value * candidate.rating.count + 3.8 * 30) /
                (candidate.rating.count + 30) /
                5) *
              100
            : null,
          request.profile.ratingPriority * 0.04,
        ],
        [
          wanted.length && candidate.review
            ? (matched.length / wanted.length) * 100
            : null,
          0.15,
        ],
        [
          candidate.distanceMeters === null
            ? null
            : Math.max(0, 1 - candidate.distanceMeters / request.radiusMeters) *
              100,
          0.15,
        ],
        [
          candidate.crowding
            ? Math.max(0, 100 - candidate.crowding.current.occupancyPercent)
            : null,
          request.profile.avoidCrowds ? 0.1 : 0,
        ],
      ]
      const available = signals.filter(
        ([score, weight]) => score !== null && weight > 0,
      )
      const base =
        available.reduce(
          (sum, [score, weight]) => sum + (score ?? 0) * weight,
          0,
        ) / available.reduce((sum, [, weight]) => sum + weight, 0)
      const aiAdjustment = Math.max(
        -10,
        Math.min(10, adjustments[candidate.id] ?? 0),
      )
      return {
        ...candidate,
        score:
          Math.round(Math.max(0, Math.min(100, base + aiAdjustment)) * 10) / 10,
        aiAdjustment,
        reasons: [
          `카테고리 관심도 ${request.profile.categoryWeights[candidate.category]}/5 반영`,
          ...(matched.length
            ? ['선호도와 질문에 맞는 음식 또는 카페 특징이 리뷰에 포함돼요.']
            : []),
          ...(candidate.rating && request.profile.ratingPriority > 0
            ? ['별점과 리뷰 수를 함께 반영했어요.']
            : []),
          ...(candidate.crowding && request.profile.avoidCrowds
            ? ['예상 혼잡도를 추천 순서에 반영했어요.']
            : []),
        ],
        missingSignals: [
          !candidate.rating ? 'rating' : '',
          !candidate.review ? 'review' : '',
          !candidate.crowding ? 'crowding' : '',
        ].filter(Boolean),
      }
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}
