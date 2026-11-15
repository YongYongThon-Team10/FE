import { categories } from './models'
import type { Category } from './models'

export const cuisineOptions = {
  korean: '한식',
  japanese: '일식',
  western: '양식',
  light: '가벼운 식사',
} as const
export const cafeOptions = {
  quiet: '조용한 분위기',
  dessert: '디저트',
  view: '전망',
  spacious: '넓은 공간',
} as const
export type TasteProfile = {
  schemaVersion: 1
  categoryWeights: Record<Category, number>
  cuisines: (keyof typeof cuisineOptions)[]
  cafeFeatures: (keyof typeof cafeOptions)[]
  ratingPriority: number
  avoidCrowds: boolean
  updatedAt: string | null
}
export const defaultTaste = (): TasteProfile => ({
  schemaVersion: 1,
  categoryWeights: {
    park: 3,
    food: 3,
    cafe: 3,
    culture: 3,
    sports: 3,
    shopping: 3,
  },
  cuisines: [],
  cafeFeatures: [],
  ratingPriority: 3,
  avoidCrowds: true,
  updatedAt: null,
})
export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
export const finite = (
  value: unknown,
  min: number,
  max: number,
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max
const weight = (value: unknown) =>
  finite(value, 0, 5) && Number.isInteger(value)
export function parseTaste(value: unknown): TasteProfile {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    !isObject(value.categoryWeights) ||
    !categories.every((category) =>
      weight((value.categoryWeights as Record<string, unknown>)[category]),
    ) ||
    !Array.isArray(value.cuisines) ||
    !value.cuisines.every(
      (item) => typeof item === 'string' && Object.hasOwn(cuisineOptions, item),
    ) ||
    !Array.isArray(value.cafeFeatures) ||
    !value.cafeFeatures.every(
      (item) => typeof item === 'string' && Object.hasOwn(cafeOptions, item),
    ) ||
    !weight(value.ratingPriority) ||
    typeof value.avoidCrowds !== 'boolean' ||
    !(
      value.updatedAt === null ||
      (typeof value.updatedAt === 'string' &&
        Number.isFinite(Date.parse(value.updatedAt)))
    )
  )
    throw new Error('선호도 데이터 형식을 확인해 주세요.')
  return {
    schemaVersion: 1,
    categoryWeights: Object.fromEntries(
      categories.map((category) => [
        category,
        (value.categoryWeights as Record<string, number>)[category],
      ]),
    ) as Record<Category, number>,
    cuisines: [...new Set(value.cuisines)] as TasteProfile['cuisines'],
    cafeFeatures: [
      ...new Set(value.cafeFeatures),
    ] as TasteProfile['cafeFeatures'],
    ratingPriority: value.ratingPriority as number,
    avoidCrowds: value.avoidCrowds,
    updatedAt: value.updatedAt as string | null,
  }
}
