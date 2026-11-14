import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '@/services/kakaoMaps'
import type {
  KakaoMap as MapInstance,
  KakaoMaps,
  KakaoLayer,
} from '@/services/kakaoMaps'
import type { PlaceMapProps } from './PlaceMap'

export default function KakaoMap({
  places,
  selectedId,
  onSelect,
  current,
  connect = false,
}: PlaceMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapInstance | null>(null)
  const onSelectRef = useRef(onSelect)
  const [sdk, setSdk] = useState<KakaoMaps | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    let active = true
    const host = container.current
    if (!host) return
    let resize: ResizeObserver | undefined
    void loadKakaoMaps()
      .then((maps) => {
        if (!active) return
        const instance = new maps.Map(host, {
          center: new maps.LatLng(37.2426, 127.0987),
          level: 5,
          scrollwheel: false,
        })
        map.current = instance
        resize = new ResizeObserver(() => instance.relayout())
        resize.observe(host)
        setSdk(maps)
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : '지도를 불러오지 못했어요.',
          )
      })
    return () => {
      active = false
      resize?.disconnect()
      map.current = null
      host.replaceChildren()
    }
  }, [attempt])
  useEffect(() => {
    const instance = map.current
    if (!instance || !sdk) return
    const layers: KakaoLayer[] = []
    const bounds = new sdk.LatLngBounds()
    const points = places.filter((place) => place.location !== null)
    const route = points.map(
      (place) => new sdk.LatLng(place.location!.lat, place.location!.lng),
    )
    const overlaps = new Map<string, number>()
    points.forEach((place, index) => {
      const position = route[index]
      const button = document.createElement('button')
      const key = `${place.location!.lat},${place.location!.lng}`
      const overlap = overlaps.get(key) ?? 0
      overlaps.set(key, overlap + 1)
      button.type = 'button'
      button.className = `kakao-map-marker ${place.id === selectedId ? 'selected' : ''}`
      button.style.transform = `translateX(${overlap * 28}px)`
      button.textContent = String(index + 1)
      button.title = place.name
      button.setAttribute('aria-label', place.name)
      button.setAttribute('aria-pressed', String(place.id === selectedId))
      button.onclick = () => onSelectRef.current(place)
      const marker = new sdk.CustomOverlay({
        position,
        content: button,
        yAnchor: 1,
        zIndex: place.id === selectedId ? 10 : 1,
      })
      marker.setMap(instance)
      layers.push(marker)
      bounds.extend(position)
    })
    if (current) {
      const position = new sdk.LatLng(current.lat, current.lng)
      const dot = document.createElement('span')
      dot.className = 'kakao-current-location'
      dot.setAttribute('aria-label', '현재 위치')
      const marker = new sdk.CustomOverlay({
        position,
        content: dot,
        zIndex: 20,
      })
      marker.setMap(instance)
      layers.push(marker)
      bounds.extend(position)
    }
    if (connect && route.length > 1) {
      const line = new sdk.Polyline({
        path: route,
        strokeWeight: 3,
        strokeColor: '#2849b2',
        strokeOpacity: 1,
        strokeStyle: 'shortdash',
      })
      line.setMap(instance)
      layers.push(line)
    }
    if (points.length + Number(Boolean(current)) > 1)
      instance.setBounds(bounds, 40, 40, 40, 40)
    else if (route[0]) instance.setCenter(route[0])
    else if (current)
      instance.setCenter(new sdk.LatLng(current.lat, current.lng))
    return () => layers.forEach((layer) => layer.setMap(null))
  }, [sdk, places, current, connect, selectedId])
  useEffect(() => {
    const selected = places.find((place) => place.id === selectedId)
    if (sdk && selected?.location)
      map.current?.panTo(
        new sdk.LatLng(selected.location.lat, selected.location.lng),
      )
  }, [sdk, selectedId, places])
  return (
    <div className="map-wrap">
      <div
        ref={container}
        className="place-map"
        role="region"
        aria-label="장소 위치 지도"
        data-map-provider="kakao"
      />
      {!sdk && !error && (
        <p className="map-warning" role="status">
          카카오 지도를 불러오는 중이에요…
        </p>
      )}
      {error && (
        <div className="map-warning" role="alert">
          <p>{error} 아래 장소 목록에서도 정보를 확인할 수 있어요.</p>
          <button
            type="button"
            className="text-button small"
            onClick={() => {
              setError('')
              setAttempt((value) => value + 1)
            }}
          >
            지도 다시 불러오기
          </button>
        </div>
      )}
    </div>
  )
}
