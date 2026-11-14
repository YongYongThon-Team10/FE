import { searchPlaces } from './places'
import type { PlaceResults } from './places'

// Editorial selection from Yongin Tourism's stamp-tour destinations.
// https://itour.yongin.go.kr/stamptourdetail?stampCrsId=10
// These are search names only. IDs, addresses and coordinates come from Kakao.
export const landmarkNames = [
  '에버랜드',
  '한국민속촌',
  '호암미술관',
  '와우정사',
  '용인농촌테마파크',
  '한택식물원',
] as const
const normalize = (value: string) => value.replace(/\s/g, '')
export async function recommendedPlaces(
  signal: AbortSignal,
): Promise<PlaceResults> {
  const results = await Promise.allSettled(
    landmarkNames.map((name) => searchPlaces(name, 1, signal)),
  )
  signal.throwIfAborted()
  const fulfilled = results.filter((result) => result.status === 'fulfilled')
  if (!fulfilled.length)
    throw new Error('대표 명소 정보를 불러오지 못했어요. 다시 시도해 주세요.')
  const places = results.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return []
    const match = result.value.places.find(
      (place) =>
        normalize(place.name) === normalize(landmarkNames[index]) &&
        /^(?:경기|경기도) 용인시/.test(place.address) &&
        (['AT4', 'CT1'].includes(place.categoryGroup) ||
          (place.categoryGroup === '' && place.category.includes('절,사찰'))) &&
        !/주차|매표|정류장|출입구|화장실/.test(place.name + place.category),
    )
    return match ? [match] : []
  })
  const unique = places.filter(
    (place, index) => places.findIndex((p) => p.id === place.id) === index,
  )
  return {
    places: unique,
    query: '용인 대표 명소',
    page: 1,
    isEnd: true,
    totalCount: unique.length,
    pageableCount: unique.length,
    source: '카카오맵',
    fetchedAt: fulfilled.map((result) => result.value.fetchedAt).sort()[0],
  }
}
