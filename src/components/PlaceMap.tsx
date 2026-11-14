import { lazy, Suspense } from 'react'
import type { Coordinate, Place } from '@/domain/models'
import { kakaoJavaScriptKey } from '@/services/kakaoMaps'
const KakaoMap = lazy(() => import('./KakaoMap'))
const LeafletMap = lazy(() => import('./LeafletMap'))

export type PlaceMapProps = {
  places: Place[]
  selectedId?: string
  onSelect: (place: Place) => void
  current?: Coordinate | null
  connect?: boolean
}
export default function PlaceMap(props: PlaceMapProps) {
  const Map = kakaoJavaScriptKey ? KakaoMap : LeafletMap
  return (
    <Suspense
      fallback={
        <p className="info" role="status">
          지도를 준비하고 있어요…
        </p>
      }
    >
      <Map {...props} />
    </Suspense>
  )
}
