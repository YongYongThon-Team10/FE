import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordinate, Place } from '@/domain/models'

export default function PlaceMap({
  places,
  selectedId,
  onSelect,
  current,
  connect = false,
}: {
  places: Place[]
  selectedId?: string
  onSelect: (place: Place) => void
  current?: Coordinate | null
  connect?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const onSelectRef = useRef(onSelect)
  const markers = useRef(new Map<string, L.Marker>())
  const [tileError, setTileError] = useState(false)
  const [tileLoading, setTileLoading] = useState(true)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
    }).setView([37.2426, 127.0987], 14)
    map.current = instance
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    })
      .on('tileload', () => setTileLoading(false))
      .on('tileerror', () => {
        setTileError(true)
        setTileLoading(false)
      })
      .addTo(instance)
    const resize = new ResizeObserver(() => instance.invalidateSize())
    resize.observe(container.current)
    return () => {
      resize.disconnect()
      instance.remove()
      map.current = null
    }
  }, [])
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const layer = L.layerGroup().addTo(instance)
    markers.current.clear()
    const points = places.filter(
      (p): p is Place & { location: Coordinate } => p.location !== null,
    )
    const coords: L.LatLngTuple[] = points.map((p) => [
      p.location.lat,
      p.location.lng,
    ])
    const overlapCounts = new Map<string, number>()
    points.forEach((place, index) => {
      const coordinateKey = `${place.location.lat},${place.location.lng}`
      const overlap = overlapCounts.get(coordinateKey) ?? 0
      overlapCounts.set(coordinateKey, overlap + 1)
      const icon = L.divIcon({
        className: 'map-marker',
        html: `<span>${index + 1}</span>`,
        iconSize: [34, 42],
        iconAnchor: [17 - overlap * 28, 40],
      })
      const marker = L.marker([place.location.lat, place.location.lng], {
        icon,
        title: place.name,
        alt: place.name,
        keyboard: true,
      })
        .on('click', () => onSelectRef.current(place))
        .addTo(layer)
      markers.current.set(place.id, marker)
    })
    if (current) {
      L.circleMarker([current.lat, current.lng], {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#2849b2',
        fillOpacity: 1,
      })
        .bindTooltip('현재 위치')
        .addTo(layer)
      coords.push([current.lat, current.lng])
    }
    if (connect && coords.length > 1)
      L.polyline(
        points.map((p) => [p.location.lat, p.location.lng] as L.LatLngTuple),
        { color: '#2849b2', weight: 3, dashArray: '6 8' },
      ).addTo(layer)
    if (coords.length > 1)
      instance.fitBounds(coords, {
        padding: [35, 35],
        maxZoom: 15,
        animate: false,
      })
    else if (coords.length === 1)
      instance.setView(coords[0], 15, { animate: false })
    return () => {
      layer.remove()
    }
  }, [places, current, connect])
  useEffect(() => {
    const marker = selectedId ? markers.current.get(selectedId) : null
    if (marker) map.current?.panTo(marker.getLatLng())
  }, [selectedId])
  return (
    <div className="map-wrap">
      <div
        ref={container}
        className="place-map"
        role="region"
        aria-label="장소 위치 지도"
      />
      {tileLoading && !tileError && (
        <p className="map-warning" role="status">
          지도 배경을 불러오는 중이에요…
        </p>
      )}
      {tileError && (
        <p className="map-warning" role="status">
          지도 배경을 불러오지 못했어요. 아래 장소 목록에서 정보를 확인할 수
          있어요.
        </p>
      )}
    </div>
  )
}
