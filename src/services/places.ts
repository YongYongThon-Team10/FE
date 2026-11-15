export const placesApiBase = (import.meta.env.VITE_PLACES_API_BASE ?? '')
  .trim()
  .replace(/\/$/, '')
export const livePlaces = Boolean(placesApiBase)
import type { ImageFields } from '@/domain/images'
import type { CrowdingFields } from '@/domain/personalization'
import { parseCrowding } from '@/domain/personalization'
export type SearchPlace = ImageFields &
  CrowdingFields & {
    id: string
    name: string
    category: string
    categoryGroup: string
    address: string
    roadAddress: string
    phone: string
    distanceMeters?: number | null
    location: { lat: number; lng: number }
    url: string
  }
export type PlaceResults = {
  places: SearchPlace[]
  query: string
  page: number
  isEnd: boolean
  totalCount: number
  pageableCount: number
  source: string
  fetchedAt: string
}
export async function searchPlaces(
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<PlaceResults> {
  const params = new URLSearchParams({ q: query, page: String(page) })
  return requestPlaces(`places?${params}`, signal)
}
export async function nearbyPlaces(
  lat: number,
  lng: number,
  category: 'FD6' | 'CE7',
  radius: number,
  signal: AbortSignal,
): Promise<PlaceResults> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    category,
    radius: String(radius),
  })
  return requestPlaces(`nearby?${params}`, signal)
}
async function requestPlaces(
  path: string,
  signal: AbortSignal,
): Promise<PlaceResults> {
  const response = await fetch(`${placesApiBase}/${path}`, { signal })
  const value = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      typeof value?.error === 'string'
        ? value.error
        : '장소를 검색하지 못했어요. 다시 시도해 주세요.',
    )
  if (
    !value ||
    !Array.isArray(value.places) ||
    typeof value.isEnd !== 'boolean' ||
    !value.places.every(
      (p: SearchPlace) =>
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.address === 'string' &&
        typeof p.phone === 'string' &&
        typeof p.roadAddress === 'string' &&
        typeof p.category === 'string' &&
        typeof p.categoryGroup === 'string' &&
        Number.isFinite(p.location?.lat) &&
        Number.isFinite(p.location?.lng) &&
        p.location.lat >= -90 &&
        p.location.lat <= 90 &&
        p.location.lng >= -180 &&
        p.location.lng <= 180 &&
        typeof p.url === 'string' &&
        /^https:\/\/place\.map\.kakao\.com\/\d+$/.test(p.url),
    )
  )
    throw new Error('장소 검색 응답을 확인하지 못했어요. 다시 시도해 주세요.')
  return {
    ...value,
    places: value.places.map((place: SearchPlace) => {
      let crowding = null
      try {
        if (place.crowding) crowding = parseCrowding(place.crowding)
        if (
          place.crowdingPlaceId &&
          crowding?.placeId !== place.crowdingPlaceId
        )
          crowding = null
      } catch {
        /* Invalid optional signals must not block place selection. */
      }
      return {
        ...place,
        crowding,
        crowdingUnavailable: place.crowding != null && !crowding,
        crowdingPlaceId:
          typeof place.crowdingPlaceId === 'string' &&
          place.crowdingPlaceId.trim()
            ? place.crowdingPlaceId
            : null,
      }
    }),
  } as PlaceResults
}
