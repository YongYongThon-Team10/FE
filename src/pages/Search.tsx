import { useState } from 'react'
import { useResource } from '@/hooks/useResource'
import { searchEvents } from '@/services/teamBackend/search'
import { searchPlaces } from '@/services/places'
import { go } from '@/hooks/useRoute'
import { PlaceCard } from './Places'

export function Search({
  query,
  eventPage = 0,
  placePage = 1,
}: {
  query: string
  eventPage?: number
  placePage?: number
}) {
  const [text, setText] = useState(query)
  const returnPath = `/search?q=${encodeURIComponent(query)}&eventPage=${eventPage}&placePage=${placePage}`
  const setEventPage = (page: number) =>
    go(
      `/search?q=${encodeURIComponent(query)}&eventPage=${page}&placePage=${placePage}`,
    )
  const setPlacePage = (page: number) =>
    go(
      `/search?q=${encodeURIComponent(query)}&eventPage=${eventPage}&placePage=${page}`,
    )
  const events = useResource((signal) => searchEvents(query, signal), query)
  const places = useResource(
    (signal) => searchPlaces(query, placePage, signal),
    `${query}:${placePage}`,
  )
  return (
    <div className="stack">
      <h1>장소와 행사를 함께 찾아요</h1>
      <form
        role="search"
        className="row search-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) go(`/search?q=${encodeURIComponent(text.trim())}`)
        }}
      >
        <input
          aria-label="통합 검색어"
          value={text}
          maxLength={120}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="primary" type="submit">
          검색
        </button>
      </form>
      <section className="stack" aria-label="행사 검색 결과">
        <h2>축제·행사</h2>
        {events.error ? (
          <p className="error" role="alert">
            {events.error} 장소 검색은 아래에서 계속 이용할 수 있어요.{' '}
            <button onClick={events.retry}>행사 검색 다시 시도</button>
          </p>
        ) : !events.data ? (
          <p role="status">행사를 찾고 있어요…</p>
        ) : (
          <>
            <p role="status">
              행사 검색 결과 {events.data.events.length}건 ·{' '}
              {events.data.dateFrom} ~ {events.data.dateTo}
            </p>
            {!events.data.events.length && (
              <p>
                조건에 맞는 행사가 없어요. 다른 날짜나 행사명을 입력해 주세요.
              </p>
            )}
            {events.data.events
              .slice(eventPage * 12, eventPage * 12 + 12)
              .map((e) => (
                <article className="panel stack" key={e.eventId}>
                  <h3>
                    <a
                      href={`#/festivals/${encodeURIComponent(e.eventId)}?return=${encodeURIComponent(returnPath)}`}
                    >
                      {e.name}
                    </a>
                  </h3>
                  <p>
                    {e.startDate ?? '날짜 미확인'} ~{' '}
                    {e.endDate ?? '날짜 미확인'}
                  </p>
                  <p>
                    {e.placeName ?? e.address ?? '장소 미확인'} ·{' '}
                    {e.fee ?? '요금 정보 없음'}
                  </p>
                </article>
              ))}
            {events.data.events.length > 12 && (
              <div className="row between">
                <button
                  disabled={!eventPage}
                  onClick={() => setEventPage(eventPage - 1)}
                >
                  행사 이전 페이지
                </button>
                <span>{eventPage + 1}페이지</span>
                <button
                  disabled={(eventPage + 1) * 12 >= events.data.events.length}
                  onClick={() => setEventPage(eventPage + 1)}
                >
                  행사 다음 페이지
                </button>
              </div>
            )}
          </>
        )}
        <a className="secondary" href="#/festivals">
          날짜·지역으로 행사 찾아보기
        </a>
      </section>
      <section className="stack" aria-label="장소 검색 결과">
        <h2>장소·맛집·카페</h2>
        {places.error ? (
          <p className="error" role="alert">
            {places.error}{' '}
            <button onClick={places.retry}>장소 검색 다시 시도</button>
          </p>
        ) : !places.data ? (
          <p role="status">장소를 찾고 있어요…</p>
        ) : (
          <>
            <p>장소 검색 결과 {places.data.totalCount}곳</p>
            {!places.data.places.length && (
              <p>
                검색된 장소가 없어요. 장소명이나 카페·공원 같은 키워드로 다시
                검색해 주세요.
              </p>
            )}
            {places.data.places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
            <div className="row between">
              <button
                disabled={placePage === 1}
                onClick={() => setPlacePage(placePage - 1)}
              >
                장소 이전 페이지
              </button>
              <span>{placePage}페이지</span>
              <button
                disabled={places.data.isEnd}
                onClick={() => setPlacePage(placePage + 1)}
              >
                장소 다음 페이지
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
