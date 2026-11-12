import { lazy, Suspense, useMemo, useState } from 'react'
import type { Event, Place } from '@/domain/models'
import { emptyFilters } from '@/domain/models'
import { EventCard, EventBadges, EventImage } from '@/components/EventCard'
import { FilterPanel } from '@/components/Filters'
import { CategoryIcon } from '@/components/Brand'
import {
  filterEvents,
  priceText,
  eventDate,
  distanceKm,
} from '@/domain/planning'
import { safeUrl } from '@/domain/validation'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
const PlaceMap = lazy(() => import('@/components/PlaceMap'))

export function Events({ mapView = false }: { mapView?: boolean }) {
  const {
    data,
    filters,
    setFilters,
    location,
    locate,
    locating,
    locationError,
  } = useApp()
  const [sort, setSort] = useState('date')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const results = useMemo(
    () =>
      filterEvents(data?.events ?? [], filters).sort((a, b) =>
        sort === 'distance' && location
          ? (a.location ? distanceKm(location, a.location) : Infinity) -
            (b.location ? distanceKm(location, b.location) : Infinity)
          : Date.parse(a.startsAt) - Date.parse(b.startsAt),
      ),
    [data, filters, sort, location],
  )
  const selected = results.find((e) => e.id === selectedId)
  return (
    <>
      <h1>가고 싶은 행사를 골라요</h1>
      <form className="row search-form" onSubmit={(e) => e.preventDefault()}>
        <input
          aria-label="행사명 검색"
          placeholder="행사명·장소로 검색"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => setFilters(emptyFilters)}
        >
          초기화
        </button>
      </form>
      <details className="filter-details">
        <summary>
          검색 조건 수정 <span className="blue">⌄</span>
        </summary>
        <FilterPanel compact />
      </details>
      <div className="row between">
        <h2>
          행사 리스트 <span className="blue">{results.length}</span>
        </h2>
        <select
          aria-label="행사 정렬"
          className="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="date">날짜 가까운 순</option>
          <option value="distance" disabled={!location}>
            거리 가까운 순
          </option>
        </select>
      </div>
      <div className="segmented">
        <button
          type="button"
          aria-pressed={!mapView}
          className={!mapView ? 'active' : ''}
          onClick={() => go('/events')}
        >
          목록
        </button>
        <button
          type="button"
          aria-pressed={mapView}
          className={mapView ? 'active' : ''}
          onClick={() => go('/map')}
        >
          지도
        </button>
      </div>
      <button
        type="button"
        className="text-button small align-left"
        disabled={locating}
        onClick={() => void locate().catch(() => {})}
      >
        {locating ? '위치 확인 중…' : '⌖ 내 위치로 거리 확인'}
      </button>
      {locationError && (
        <p className="error small" role="alert">
          {locationError}
        </p>
      )}
      {!results.length ? (
        <section className="empty-state">
          <CategoryIcon category="park" size={40} />
          <h2>조건에 맞는 행사가 없어요</h2>
          <p>날짜나 지역 조건을 조금 넓혀 보세요.</p>
          <button
            className="primary"
            type="button"
            onClick={() => setFilters(emptyFilters)}
          >
            조건 초기화
          </button>
        </section>
      ) : mapView ? (
        <>
          <Suspense fallback={<p className="info">지도를 준비하고 있어요…</p>}>
            <PlaceMap
              places={results}
              current={location}
              selectedId={selected?.id}
              onSelect={(p) => setSelectedId(p.id)}
            />
          </Suspense>
          {results.some((e) => !e.location) && (
            <p className="small muted">
              위치 정보가 없는 행사는 목록에서 확인할 수 있어요.
            </p>
          )}
          {selected ? (
            <div className="map-preview" aria-live="polite">
              <div className="row between">
                <strong>선택한 행사</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSelectedId(undefined)}
                >
                  닫기
                </button>
              </div>
              <EventCard event={selected} origin={location} />
            </div>
          ) : (
            <p className="info small">마커를 누르면 행사 정보가 열려요.</p>
          )}
          <div className="stack">
            {results.map((e, i) => (
              <button
                key={e.id}
                className={`place-list-item ${selected?.id === e.id ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedId(e.id)}
              >
                <span className="number-badge">{i + 1}</span>
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.venue} · {priceText(e.price)}
                    {location && e.location
                      ? ` · 직선 ${distanceKm(location, e.location).toFixed(1)}km`
                      : ''}
                  </small>
                </span>
                <span>›</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        results.map((e) => <EventCard key={e.id} event={e} origin={location} />)
      )}
    </>
  )
}
export function Detail({ event }: { event: Event }) {
  const { favorites, favorite } = useApp()
  return (
    <>
      <EventImage event={event} detail />
      <EventBadges event={event} />
      <div className="row between">
        <h1 className="blue">{event.name}</h1>
        <button
          type="button"
          className={`favorite-button ${favorites.includes(event.id) ? 'active' : ''}`}
          aria-label="관심 행사 저장"
          aria-pressed={favorites.includes(event.id)}
          onClick={() => favorite(event.id)}
        >
          {favorites.includes(event.id) ? '♥' : '♡'}
        </button>
      </div>
      <p className="small muted">{event.description}</p>
      <section className="panel">
        <h2>방문 전 확인해 주세요</h2>
        <dl className="info-list">
          <div>
            <dt>일시</dt>
            <dd>
              {eventDate(event)} ·{' '}
              {new Intl.DateTimeFormat('ko-KR', {
                timeZone: 'Asia/Seoul',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date(event.startsAt))}{' '}
              시작
            </dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{event.venue || '정보 없음'}</dd>
          </div>
          <div>
            <dt>주소</dt>
            <dd>{event.address || '정보 없음'}</dd>
          </div>
          <div>
            <dt>요금</dt>
            <dd>{priceText(event.price)}</dd>
          </div>
          <div>
            <dt>신청</dt>
            <dd>
              {event.participation || '정보 없음'}
              {safeUrl(event.applicationUrl) && (
                <a
                  className="blue block"
                  href={safeUrl(event.applicationUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  신청 채널 열기 ↗
                </a>
              )}
            </dd>
          </div>
        </dl>
        <a
          className="source-link"
          href={`#/sources/${encodeURIComponent(event.id)}`}
        >
          신청·출처 안내 ↗
        </a>
      </section>
      <section className="panel stack">
        <h2>어떤 즐거움이 있나요?</h2>
        {event.programs.length ? (
          event.programs.map((p) => (
            <div className="row" key={p.id}>
              <CategoryIcon category={p.category} />
              <div>
                <strong>{p.name}</strong>
                <p className="tiny muted">
                  {priceText(p.price)} · {p.durationMinutes}분
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="small muted">프로그램 정보 없음</p>
        )}
      </section>
      <a
        className="secondary"
        href={`#/event-map/${encodeURIComponent(event.id)}`}
      >
        ⌖ 행사 위치 확인하기
      </a>
      <div className="sticky-action">
        <button
          type="button"
          className="primary"
          onClick={() => go(`/configure/${encodeURIComponent(event.id)}`)}
        >
          이 행사로 하루 짜기 →
        </button>
      </div>
    </>
  )
}
export function Sources({ event }: { event: Event }) {
  return (
    <>
      <h1 className="blue">신청 전에 확인해 주세요</h1>
      <p className="small muted">
        행사 정보는 각 출처의 안내를 확인해 주세요. 신청은 원문 채널에서
        진행합니다.
      </p>
      {event.notice && <p className="warning">{event.notice}</p>}
      {event.conflicts.map((conflict, index) => (
        <section className="panel stack" key={`${conflict.field}-${index}`}>
          <h2>{conflict.field} 안내 차이</h2>
          {conflict.entries.map((e, i) => (
            <div key={i}>
              <strong className="small">{e.sourceName}</strong>
              <p className="small muted">{e.value}</p>
              {safeUrl(e.url) && (
                <a
                  href={safeUrl(e.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blue small"
                >
                  원문 확인 ↗
                </a>
              )}
            </div>
          ))}
        </section>
      ))}
      {(event.sources.length ? event.sources : [event.source]).map(
        (source, i) => (
          <section key={i} className="panel stack">
            <h2>{source.name}</h2>
            <p className="small muted">
              갱신:{' '}
              {new Date(source.updatedAt).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}
            </p>
            {source.isDemo && (
              <p className="warning small">
                시연용 행사 정보예요. 실제 운영 정보와 다를 수 있어요.
              </p>
            )}
            {safeUrl(source.url) ? (
              <a
                href={safeUrl(source.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="primary"
              >
                원문 페이지 열기 ↗
              </a>
            ) : (
              <p className="small muted">원문 링크 정보 없음</p>
            )}
          </section>
        ),
      )}
      {safeUrl(event.applicationUrl) && (
        <a
          className="primary"
          href={safeUrl(event.applicationUrl)}
          target="_blank"
          rel="noopener noreferrer"
        >
          신청 채널 열기 ↗
        </a>
      )}
    </>
  )
}
export function PlaceInformation({ place }: { place: Place }) {
  return (
    <section className="panel place-information" aria-live="polite">
      <div className="row">
        <CategoryIcon category={place.category} />
        <h2>{place.name}</h2>
      </div>
      <p className="small muted">{place.description}</p>
      <dl className="info-list">
        <div>
          <dt>주소</dt>
          <dd>{place.address || '정보 없음'}</dd>
        </div>
        <div>
          <dt>요금</dt>
          <dd>{priceText(place.price)}</dd>
        </div>
        <div>
          <dt>운영</dt>
          <dd>{place.openingHours || '정보 없음'}</dd>
        </div>
      </dl>
      <p className="tiny muted">
        {place.source.isDemo ? '시연용 장소·좌표' : place.source.name} ·{' '}
        {new Date(place.source.updatedAt).toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
        })}
      </p>
      {safeUrl(place.source.url) && (
        <a
          className="blue small"
          href={safeUrl(place.source.url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          출처 확인 ↗
        </a>
      )}
    </section>
  )
}
