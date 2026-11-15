import { SERVICE_NAME } from '@/config/brand'
import { useEffect, useRef, useState } from 'react'
import { EventCard } from '@/components/EventCard'
import { Places } from './Places'
import { emptyFilters } from '@/domain/models'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { interpretSearch } from '@/services/search'
import { livePlaces } from '@/services/places'
import { teamBackend } from '@/services/teamBackend'

export function Home() {
  const { setFilters, data, error, reload } = useApp()
  const [text, setText] = useState('')
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  const search = async () => {
    if (livePlaces) {
      go(
        `/${teamBackend.enabled ? 'search' : 'places'}?q=${encodeURIComponent(text.trim() || '용인 관광명소')}`,
      )
      return
    }
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setSearching(true)
    setMessage('')
    try {
      const filters = text.trim()
        ? await interpretSearch(text.trim(), controller.signal)
        : { ...emptyFilters }
      if (controller.signal.aborted) return
      setFilters(filters)
      go('/events')
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : '검색하지 못했어요. 다시 시도해 주세요.',
        )
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null
        setSearching(false)
      }
    }
  }

  return (
    <>
      <div className="home-greeting">
        <img src="/figma/landing-brand.svg" alt={SERVICE_NAME} />
        <label htmlFor="home-search">어떤 하루를 보내고 싶으세요?</label>
      </div>
      <section className="home-hero" aria-labelledby="home-title">
        <p className="eyebrow">가까운 곳에서 발견하는 즐거움</p>
        <div className="home-banner">
          <img className="home-bridge" src="/figma/landing-bridge.svg" alt="" />
          <h1 id="home-title" aria-label={SERVICE_NAME}>
            <span className="home-today">오늘,</span>
            <span>
              <strong>{SERVICE_NAME}</strong>
            </span>
          </h1>
          <form
            className="home-search"
            role="search"
            aria-busy={searching}
            onSubmit={(event) => {
              event.preventDefault()
              void search()
            }}
          >
            <img
              className="home-search-icon"
              src="/figma/landing-search.svg"
              alt=""
            />
            <input
              id="home-search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={
                livePlaces
                  ? teamBackend.enabled
                    ? '장소·행사명 또는 내일 무료 공연'
                    : '용인중앙시장, 카페, 공원'
                  : '이번 주말 아이와 갈 곳'
              }
              maxLength={livePlaces ? 120 : 200}
              disabled={searching}
              aria-describedby={message ? 'home-search-error' : undefined}
            />
            <button
              type="submit"
              className="home-search-submit"
              aria-label="검색"
              disabled={searching}
            >
              <img src="/figma/landing-submit-circle.svg" alt="" />
              <img
                className="home-search-arrow"
                src="/figma/landing-submit-arrow.svg"
                alt=""
              />
            </button>
          </form>
        </div>
        {searching && (
          <p className="small blue" role="status">
            원하는 하루를 찾고 있어요…
          </p>
        )}
        {message && (
          <p id="home-search-error" className="error small" role="alert">
            {message}
          </p>
        )}
      </section>
      <section
        className="home-recommendations stack"
        aria-labelledby="home-recommendations-title"
      >
        {teamBackend.enabled && (
          <a className="secondary" href="#/festivals">
            용인 축제와 행사 찾아보기
          </a>
        )}
        <div className="row between">
          <h2 id="home-recommendations-title">
            {livePlaces ? '처음이라면, 용인 대표 명소' : '이번 주말 추천 행사'}
          </h2>
          <a
            className="small blue nowrap"
            href={livePlaces ? '#/places?q=용인%20관광명소' : '#/events'}
            onClick={() => setFilters({ ...emptyFilters })}
          >
            {livePlaces ? '장소 더 보기 →' : '행사 전체 보기 →'}
          </a>
        </div>
        {livePlaces && (
          <p className="small muted">
            용인의 대표 명소 한 곳을 고르고, 주변 맛집과 카페를 더해 하루를
            만들어 보세요.
          </p>
        )}
        {livePlaces && (
          <p className="tiny muted">
            사진은 촬영 당시 모습으로 현재 계절과 다를 수 있어요.
          </p>
        )}
        {livePlaces && <Places embedded />}
        {!livePlaces &&
          !data &&
          (error ? (
            <p className="error small" role="alert">
              추천 행사를 불러오지 못했어요.{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => void reload()}
              >
                추천 다시 불러오기
              </button>
            </p>
          ) : (
            <p className="small muted" role="status">
              추천 행사를 찾고 있어요…
            </p>
          ))}
        {!livePlaces &&
          data?.events
            .slice(0, 5)
            .map((event) => <EventCard key={event.id} event={event} />)}
        {!livePlaces && data?.events.length === 0 && (
          <p className="info">
            등록된 행사가 없어요. 잠시 후 다시 확인해 주세요.
          </p>
        )}
      </section>
    </>
  )
}
