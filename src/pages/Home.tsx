import { useEffect, useRef, useState } from 'react'
import { EventCard } from '@/components/EventCard'
import { emptyFilters } from '@/domain/models'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { interpretSearch } from '@/services/search'

export function Home() {
  const { setFilters, data } = useApp()
  const [text, setText] = useState('')
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])

  const search = async () => {
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
        <img src="/figma/landing-brand.svg" alt="용인 나들이" />
        <label htmlFor="home-search">어떤 하루를 보내고 싶으세요?</label>
      </div>
      <section className="home-hero" aria-labelledby="home-title">
        <p className="eyebrow">가까운 곳에서 발견하는 즐거움</p>
        <div className="home-banner">
          <img className="home-bridge" src="/figma/landing-bridge.svg" alt="" />
          <h1 id="home-title" aria-label="오늘, 용인 어디 갈까?">
            <span className="home-today">오늘,</span>
            <span>
              <strong>용인</strong> 어디 갈까?
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
              placeholder="이번 주말 아이와 갈 곳"
              maxLength={200}
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
        <div className="row between">
          <h2 id="home-recommendations-title">이번 주말 추천 행사</h2>
          <a
            className="small blue nowrap"
            href="#/events"
            onClick={() => setFilters({ ...emptyFilters })}
          >
            행사 전체 보기 →
          </a>
        </div>
        {data?.events.slice(0, 5).map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {data?.events.length === 0 && (
          <p className="info">
            등록된 행사가 없어요. 잠시 후 다시 확인해 주세요.
          </p>
        )}
      </section>
      <p className="small muted">
        마음에 드는 행사를 골라 하루 일정을 만들어 보세요.
      </p>
    </>
  )
}
