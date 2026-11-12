import { useState } from 'react'
import { dateKey } from '@/domain/planning'
import { useApp } from '@/state/context'
import { calendarDemoEvents } from '@/data/scenarios'
export function MonthCalendar() {
  const app = useApp()
  const calendarEvents = app.preview
    ? calendarDemoEvents
    : (app.data?.events ?? [])
  const initial = app.courses[0]?.settings.date ?? dateKey()
  const [month, setMonth] = useState(initial.slice(0, 7))
  const [selected, setSelected] = useState(initial)
  const first = new Date(`${month}-01T12:00:00+09:00`)
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const offset = first.getUTCDay()
  const shift = (by: number) => {
    const d = new Date(first)
    d.setUTCMonth(d.getUTCMonth() + by)
    setMonth(dateKey(d).slice(0, 7))
  }
  const events =
    calendarEvents.filter(
      (e) =>
        dateKey(new Date(e.startsAt)) <= selected &&
        dateKey(new Date(e.endsAt)) >= selected,
    ) ?? []
  const courses = app.courses.filter((c) => c.settings.date === selected)
  return (
    <>
      <section className="month-calendar panel">
        <div className="row between">
          <h2>
            {first.getUTCFullYear()}년 {first.getUTCMonth() + 1}월
          </h2>
          <div className="row">
            <button
              className="calendar-arrow"
              type="button"
              aria-label="이전 달"
              onClick={() => shift(-1)}
            >
              ‹
            </button>
            <button
              className="calendar-arrow"
              type="button"
              aria-label="다음 달"
              onClick={() => shift(1)}
            >
              ›
            </button>
          </div>
        </div>
        <div className="month-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <span
              className={`month-weekday ${i === 0 ? 'sunday' : i === 6 ? 'saturday' : ''}`}
              key={d}
            >
              {d}
            </span>
          ))}
          {Array.from(
            { length: Math.ceil((offset + count) / 7) * 7 },
            (_, i) => {
              const d = new Date(first)
              d.setUTCDate(i - offset + 1)
              const key = dateKey(d)
              const dayEvents =
                calendarEvents.filter(
                  (e) =>
                    dateKey(new Date(e.startsAt)) <= key &&
                    dateKey(new Date(e.endsAt)) >= key,
                ) ?? []
              return (
                <button
                  type="button"
                  key={key}
                  aria-label={`${key} 일정 보기`}
                  aria-pressed={selected === key}
                  className={`month-day ${key.slice(0, 7) !== month ? 'outside-month' : ''} ${selected === key ? 'selected' : ''}`}
                  onClick={() => setSelected(key)}
                >
                  <span>{d.getUTCDate()}</span>
                  {dayEvents.slice(0, 2).map((e, j) => (
                    <small
                      className={j === 0 ? 'blue-label' : 'coral-label'}
                      key={e.id}
                    >
                      {e.name}
                    </small>
                  ))}
                  {app.courses.some((c) => c.settings.date === key) && (
                    <i aria-label="저장한 코스 있음" />
                  )}
                </button>
              )
            },
          )}
        </div>
        <p className="tiny muted">
          날짜를 선택하면 아래에서 일정을 확인할 수 있어요.
        </p>
      </section>
      <section className="panel stack">
        <h2>
          {new Date(`${selected}T12:00:00+09:00`).toLocaleDateString('ko-KR', {
            timeZone: 'Asia/Seoul',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </h2>
        <p className="tiny muted">
          행사 {events.length}개 · 저장한 코스 {courses.length}개
        </p>
        {events.map((e) => (
          <a className="calendar-entry" key={e.id} href={`#/events/${e.id}`}>
            <span className="blue-label">행사</span>
            <div>
              <strong>{e.name}</strong>
              <p className="tiny muted">
                {dateKey(new Date(e.startsAt))} ~ {dateKey(new Date(e.endsAt))}
              </p>
            </div>
          </a>
        ))}
        {courses.map((c) => (
          <a className="calendar-entry" key={c.id} href={`#/course/${c.id}`}>
            <span className="coral-label">내 코스</span>
            <strong>{c.name}</strong>
          </a>
        ))}
        {!events.length && !courses.length && (
          <p className="small muted">이 날짜에 등록된 일정이 없어요.</p>
        )}
      </section>
    </>
  )
}
