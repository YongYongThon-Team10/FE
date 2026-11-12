import { useEffect, useRef, useState } from 'react'
import { Brand } from '@/components/Brand'
import { EventCard } from '@/components/EventCard'
import { FilterPanel } from '@/components/Filters'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { interpretSearch } from '@/services/search'
import { isDemo } from '@/services/api'

export function Home() {
  const { filters, setFilters, data } = useApp()
  const [text, setText] = useState(filters.query)
  const [interpreting, setInterpreting] = useState(false)
  const [message, setMessage] = useState('')
  const interpretation = useRef(0)
  useEffect(
    () => () => {
      interpretation.current += 1
    },
    [],
  )
  const interpret = async () => {
    const token = ++interpretation.current
    const before = filters
    setInterpreting(true)
    setMessage('')
    try {
      const result = await interpretSearch(text)
      if (token !== interpretation.current) return
      // Keep manual changes made while interpretation was in flight.
      setFilters((current) => {
        const merged = { ...result }
        for (const key of Object.keys(result) as (keyof typeof result)[]) {
          if (current[key] !== before[key])
            Object.assign(merged, { [key]: current[key] })
        }
        return merged
      })
      setMessage(
        isDemo
          ? '시연용 키워드 해석 결과예요. 아래 조건을 확인하고 수정한 뒤 검색해 주세요.'
          : '문장에서 찾은 조건이에요. 직접 수정한 조건을 우선해서 검색합니다.',
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '조건을 이해하지 못했어요.')
    } finally {
      setInterpreting(false)
    }
  }
  return (
    <>
      <section className="home-hero">
        <p className="eyebrow">가까운 곳에서 발견하는 즐거움</p>
        <div className="row home-title">
          <Brand />
          <h1>오늘, 용인 어디 갈까?</h1>
        </div>
        <p className="small muted">
          가고 싶은 곳을 고르면 주변 맛집과 볼거리까지 하루 코스로 연결해
          드려요.
        </p>
      </section>
      <section className="stack">
        <label className="search-label" htmlFor="home-search">
          어떤 하루를 보내고 싶으세요?
        </label>
        <form
          className="row search-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (interpreting) return
            if (
              /이번|주말|아이|무료|시간|야외|실내|오늘|내일|혼자|연인|친구|가족/.test(
                text,
              )
            ) {
              void interpret()
              return
            }
            setFilters({ ...filters, query: text.trim() })
            go('/events')
          }}
        >
          <input
            id="home-search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="이번 주말 아이와 갈 곳"
            maxLength={200}
          />
          <button className="primary" type="submit" disabled={interpreting}>
            검색
          </button>
        </form>
        {text.trim() && (
          <button
            className="text-button small align-left"
            type="button"
            disabled={!text.trim() || interpreting}
            onClick={() => void interpret()}
          >
            {interpreting ? '조건 확인 중…' : '문장에서 조건 찾기 ↗'}
          </button>
        )}
        {message && (
          <p className="info small" role="status">
            {message}
          </p>
        )}
      </section>
      <FilterPanel />
      <div className="row">
        <button
          className="primary grow"
          type="button"
          onClick={() => go('/events')}
        >
          조건으로 검색하기 →
        </button>
        <button className="secondary" type="button" onClick={() => go('/map')}>
          지도 보기
        </button>
      </div>
      <section className="stack">
        <div className="row between">
          <h2>이번 주말 추천 행사</h2>
          <a className="small blue" href="#/events">
            전체 보기 →
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
      <a className="secondary" href="#/facilities">
        기흥 시설 · 주차 · 주변 행사 둘러보기 →
      </a>
    </>
  )
}
