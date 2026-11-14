import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { CategoryIcon } from '@/components/Brand'
import { go } from '@/hooks/useRoute'
import { searchPlaces } from '@/services/places'
import { recommendedPlaces } from '@/services/recommendations'
import type { PlaceResults, SearchPlace } from '@/services/places'
import type { Category, Place } from '@/domain/models'
import { createRealCourse } from '@/domain/realCourse'
import { useApp } from '@/state/context'
const PlaceMap = lazy(() => import('@/components/PlaceMap'))
const category = (place: SearchPlace): Category =>
  (
    ({
      FD6: 'food',
      CE7: 'cafe',
      CT1: 'culture',
      AT4: 'park',
      MT1: 'shopping',
    }) as Record<string, Category>
  )[place.categoryGroup] ?? 'park'
function mapPlace(place: SearchPlace, fetchedAt: string): Place {
  return {
    id: place.id,
    name: place.name,
    description: place.category,
    category: category(place),
    district: '',
    address: place.roadAddress || place.address,
    location: place.location,
    imageUrl: null,
    price: null,
    durationMinutes: 0,
    openingHours: '',
    source: {
      name: '카카오맵',
      url: place.url,
      updatedAt: fetchedAt,
      isDemo: false,
    },
  }
}
function PlaceCard({ place }: { place: SearchPlace }) {
  const app = useApp()
  return (
    <article className="panel live-place-card">
      <div className="row">
        <CategoryIcon category={category(place)} size={28} />
        <div className="grow">
          <p className="tiny muted">{place.category || '장소'}</p>
          <h2>
            <a href={place.url} target="_blank" rel="noopener noreferrer">
              {place.name} ↗
            </a>
          </h2>
        </div>
      </div>
      <p className="small">{place.roadAddress || place.address}</p>
      {place.roadAddress && (
        <p className="tiny muted">지번 · {place.address}</p>
      )}
      {place.phone && (
        <a
          className="small blue"
          href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}
        >
          {place.phone}
        </a>
      )}
      <a
        className="source-link small"
        href={place.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        카카오맵 상세·운영 정보 확인 ↗
      </a>
      <button
        type="button"
        className="primary small"
        aria-label={`${place.name}로 하루 코스 만들기`}
        onClick={() => {
          const course = createRealCourse(place)
          app.storeDraft(course)
          go(`/plan/${course.id}`)
        }}
      >
        이 장소로 하루 코스 만들기 →
      </button>
    </article>
  )
}
export function Places({
  query = '용인 관광명소',
  page = 1,
  mapView = false,
  embedded = false,
}: {
  query?: string
  page?: number
  mapView?: boolean
  embedded?: boolean
}) {
  const [editing, setEditing] = useState({ query, value: query })
  const input = editing.query === query ? editing.value : query
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [resource, setResource] = useState<{
    key: string
    data?: PlaceResults
    error?: string
  } | null>(null)
  const key = `${query}\n${page}\n${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    void (
      embedded
        ? recommendedPlaces(controller.signal)
        : searchPlaces(query, page, controller.signal)
    )
      .then((data) => {
        if (!controller.signal.aborted) setResource({ key, data })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResource({
            key,
            error:
              error instanceof Error ? error.message : '검색하지 못했어요.',
          })
      })
    return () => controller.abort()
  }, [key, query, page, embedded])
  const data = resource?.key === key ? resource.data : undefined
  const error = resource?.key === key ? resource.error : undefined
  const places = useMemo(
    () => data?.places.map((p) => mapPlace(p, data.fetchedAt)) ?? [],
    [data],
  )
  const selected = data?.places.find((p) => p.id === selectedId)
  const navigate = (nextPage: number, view = mapView) =>
    go(
      `/places?q=${encodeURIComponent(query)}&page=${nextPage}${view ? '&view=map' : ''}`,
    )
  return (
    <section
      className="stack real-places"
      aria-label={embedded ? '용인 실제 장소' : '장소 검색 결과'}
    >
      {!embedded && (
        <>
          <h1>가고 싶은 장소를 찾아요</h1>
          <form
            className="row search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              go(
                `/places?q=${encodeURIComponent(input.trim() || '용인 관광명소')}`,
              )
            }}
          >
            <input
              aria-label="장소 검색어"
              placeholder="장소명·카페·공원으로 검색"
              maxLength={120}
              value={input}
              onChange={(event) =>
                setEditing({ query, value: event.target.value })
              }
            />
            <button type="submit" className="primary">
              검색
            </button>
          </form>
          <p className="small muted">
            용인시의 실제 장소를 검색합니다. 운영 시간·요금은 카카오맵 상세에서
            확인해 주세요.
          </p>
          <div className="segmented">
            <button
              type="button"
              className={!mapView ? 'active' : ''}
              aria-pressed={!mapView}
              onClick={() => navigate(page, false)}
            >
              목록
            </button>
            <button
              type="button"
              className={mapView ? 'active' : ''}
              aria-pressed={mapView}
              onClick={() => navigate(page, true)}
            >
              지도
            </button>
          </div>
        </>
      )}
      {!data && !error && (
        <p className="info" role="status">
          카카오맵에서 장소를 찾고 있어요…
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            다시 검색
          </button>
        </div>
      )}
      {data && (
        <>
          {!embedded && (
            <h2>
              검색 결과 {data.places.length}곳{' '}
              <span className="tiny muted">· {page}페이지</span>
            </h2>
          )}
          {!data.places.length && (
            <div className="empty-state">
              <h2>
                {embedded
                  ? '대표 명소 정보를 확인 중이에요'
                  : '검색된 장소가 없어요'}
              </h2>
              <p>
                장소명이나 지역명, 카페·공원 같은 키워드로 다시 검색해 주세요.
              </p>
              <a
                className="secondary"
                href="#/places?q=%EC%9A%A9%EC%9D%B8%20%EA%B3%B5%EC%9B%90"
              >
                용인 공원 찾아보기
              </a>
            </div>
          )}
          {mapView && places.length > 0 && (
            <>
              <Suspense fallback={<p role="status">지도를 준비하고 있어요…</p>}>
                <PlaceMap
                  places={places}
                  selectedId={selectedId}
                  onSelect={(place) => setSelectedId(place.id)}
                />
              </Suspense>
              {selected && (
                <div aria-live="polite">
                  <PlaceCard place={selected} />
                </div>
              )}
              <p className="small muted">마커를 누르면 장소 정보가 열려요.</p>
            </>
          )}
          {data.places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
          {!embedded && (
            <div className="row between">
              <button
                className="secondary"
                type="button"
                disabled={page <= 1}
                onClick={() => navigate(page - 1)}
              >
                이전 페이지
              </button>
              <span className="small">{page}페이지</span>
              <button
                className="secondary"
                type="button"
                disabled={data.isEnd || page >= 45}
                onClick={() => navigate(page + 1)}
              >
                다음 페이지
              </button>
            </div>
          )}
          <p className="tiny muted">
            출처 · 카카오맵 장소 검색 · 조회{' '}
            {new Date(data.fetchedAt).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
            })}
          </p>
        </>
      )}
    </section>
  )
}
