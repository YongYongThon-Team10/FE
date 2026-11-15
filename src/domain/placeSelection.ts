import type { SearchPlace } from '@/services/places'

// Keep useful facilities in search, but do not present them as day-trip anchors.
export function isSupportingFacility(place: SearchPlace): boolean {
  return (
    place.categoryGroup === 'PK6' ||
    /(?:주차장|매표소|화장실|정류장|출입구|방문자센터|고객센터|관리사무소)$/.test(
      place.category.trim(),
    ) ||
    /(?:주차장|매표소|화장실|정류장|출입구|방문자센터|고객센터|관리사무소)(?:\s*[0-9가-힣]*호)?$/.test(
      place.name.trim(),
    )
  )
}
