import { useState } from 'react'
import { dateKey, weekDates } from '@/domain/planning'
import type { Event } from '@/domain/models'

export function Calendar({
  selected,
  onSelect,
  events = [],
  anchor = dateKey(),
  showRanges = false,
}: {
  selected: string
  onSelect: (value: string) => void
  events?: Event[]
  anchor?: string
  showRanges?: boolean
}) {
  const [offset, setOffset] = useState(0)
  const dates = weekDates(anchor, offset)
  const month = new Date(`${dates[3]}T12:00:00+09:00`).getUTCMonth() + 1
  return (
    <div className="calendar">
      <div className="row calendar-heading">
        <strong>{month}월 행사 일정</strong>
        <div className="row">
          <button
            type="button"
            className="calendar-arrow"
            aria-label="이전 주"
            onClick={() => setOffset(offset - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="text-button tiny"
            onClick={() => setOffset(0)}
          >
            이번 주
          </button>
          <button
            type="button"
            className="calendar-arrow"
            aria-label="다음 주"
            onClick={() => setOffset(offset + 1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="week-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <span
            key={d}
            className={i === 0 ? 'sunday' : i === 6 ? 'saturday' : ''}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="week-grid">
        {dates.map((d) => {
          const hasEvent = events.some(
            (e) =>
              dateKey(new Date(e.startsAt)) <= d &&
              dateKey(new Date(e.endsAt)) >= d,
          )
          return (
            <button
              type="button"
              key={d}
              aria-label={`${d} 날짜 선택`}
              aria-pressed={selected === d}
              className={`calendar-day ${selected === d ? 'selected' : ''} ${d === dateKey() ? 'today' : ''}`}
              onClick={() => onSelect(selected === d ? '' : d)}
            >
              {Number(d.slice(-2))}
              {hasEvent && <i aria-hidden="true" />}
            </button>
          )
        })}
      </div>
      {showRanges && (
        <div className="week-event-ranges">
          {events
            .filter(
              (e) =>
                dateKey(new Date(e.startsAt)) <= dates[6] &&
                dateKey(new Date(e.endsAt)) >= dates[0],
            )
            .slice(0, 2)
            .map((e, i) => {
              const start = Math.max(
                0,
                dates.findIndex((d) => d >= dateKey(new Date(e.startsAt))),
              )
              const end = dates.filter(
                (d) => d <= dateKey(new Date(e.endsAt)),
              ).length
              return (
                <span
                  className={i ? 'coral-label' : 'blue-label'}
                  key={e.id}
                  style={{
                    gridColumn: `${start + 1} / ${Math.max(start + 2, end + 1)}`,
                    gridRow: i + 1,
                  }}
                >
                  {e.name}
                </span>
              )
            })}
        </div>
      )}
      {selected && (
        <p className="tiny muted calendar-selection">
          {selected} 선택 · 날짜를 다시 누르면 해제돼요.
        </p>
      )}
    </div>
  )
}
