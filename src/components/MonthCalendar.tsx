import { useStorage } from '@/hooks/useStorage'
import { dateKey } from '@/domain/planning'
import { useApp } from '@/state/context'
import { calendarDemoEvents } from '@/data/scenarios'
import { livePlaces } from '@/services/places'
import { teamBackend } from '@/services/teamBackend'
import { useResource } from '@/hooks/useResource'
export function MonthCalendar() {
  const app = useApp()
  const legacyEvents = app.preview
    ? calendarDemoEvents
    : livePlaces
      ? []
      : (app.data?.events ?? [])
  const initial = app.courses[0]?.settings.date ?? dateKey()
  const [{ month, selected }, setCalendar] = useStorage(
    'yongin.calendar.v1',
    { month: initial.slice(0, 7), selected: initial },
    (value: unknown) => {
      const v = value as { month: string; selected: string }
      if (
        !v ||
        typeof v.month !== 'string' ||
        !/^\d{4}-\d{2}$/.test(v.month) ||
        !Number.isFinite(Date.parse(`${v.month}-01`)) ||
        typeof v.selected !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(v.selected) ||
        !Number.isFinite(Date.parse(v.selected))
      )
        throw new Error('달력 날짜를 확인해 주세요.')
      return v
    },
    (value) => value,
    !app.preview,
  )
  const server = teamBackend.enabled && !app.preview
  const monthData = useResource(
    (signal) =>
      server
        ? teamBackend.calendarMonth(month, signal).then((v) => {
            if (
              !Array.isArray(v?.events) ||
              !v.events.every(
                (e) =>
                  typeof e.eventId === 'string' && typeof e.name === 'string',
              )
            )
              throw new Error('행사 캘린더 응답을 확인해 주세요.')
            return v
          })
        : Promise.resolve(null),
    `${server}:${month}`,
  )
  const dayData = useResource(
    (signal) =>
      server
        ? teamBackend.calendarDate(selected, signal).then((v) => {
            if (
              !Array.isArray(v?.events) ||
              !v.events.every(
                (e) =>
                  typeof e.eventId === 'string' && typeof e.name === 'string',
              )
            )
              throw new Error('행사 캘린더 응답을 확인해 주세요.')
            return v
          })
        : Promise.resolve(null),
    `${server}:${selected}`,
  )
  const mapEvent = (e: {
    eventId: string
    name: string
    startDate: string | null
    endDate: string | null
  }) => ({
    id: e.eventId,
    name: e.name,
    startsAt: e.startDate,
    endsAt: e.endDate,
    href: `#/festivals/${encodeURIComponent(e.eventId)}`,
  })
  const calendarEvents = server
    ? (monthData.data?.events ?? []).map(mapEvent)
    : legacyEvents.map((e) => ({ ...e, href: `#/events/${e.id}` }))
  const first = new Date(`${month}-01T12:00:00+09:00`)
  const count = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const offset = first.getUTCDay()
  const shift = (by: number) => {
    const d = new Date(first)
    d.setUTCMonth(d.getUTCMonth() + by)
    const next = dateKey(d).slice(0, 7)
    setCalendar({ month: next, selected: `${next}-01` })
  }
  const events = server
    ? (dayData.data?.events ?? []).map(mapEvent)
    : calendarEvents.filter(
        (e) =>
          e.startsAt &&
          e.endsAt &&
          dateKey(new Date(e.startsAt)) <= selected &&
          dateKey(new Date(e.endsAt)) >= selected,
      )
  const courses = app.courses.filter((c) => c.settings.date === selected)
  return (
    <>
      {server && (
        <p className="small muted">
          공식 행사와 이 브라우저에 저장한 코스를 함께 확인해요.
        </p>
      )}
      {server &&
        !monthData.data &&
        (monthData.error ? (
          <p className="error" role="alert">
            {monthData.error}{' '}
            <button onClick={monthData.retry}>월간 행사 다시 불러오기</button>
          </p>
        ) : (
          <p role="status">월간 행사를 불러오고 있어요.</p>
        ))}
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
                    e.startsAt &&
                    e.endsAt &&
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
                  onClick={() =>
                    setCalendar({ month: key.slice(0, 7), selected: key })
                  }
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
        {server && !dayData.data ? (
          dayData.error ? (
            <p className="error" role="alert">
              {dayData.error}{' '}
              <button onClick={dayData.retry}>선택 날짜 다시 불러오기</button>
            </p>
          ) : (
            <p role="status">선택 날짜의 행사를 불러오고 있어요.</p>
          )
        ) : (
          <p className="tiny muted">
            행사 {events.length}개 · 저장한 코스 {courses.length}개
          </p>
        )}
        {events.map((e) => (
          <a className="calendar-entry" key={e.id} href={e.href}>
            <span className="blue-label">행사</span>
            <div>
              <strong>{e.name}</strong>
              <p className="tiny muted">
                {e.startsAt ? dateKey(new Date(e.startsAt)) : '날짜 미확인'} ~{' '}
                {e.endsAt ? dateKey(new Date(e.endsAt)) : '날짜 미확인'}
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
        {(!server || dayData.data) && !events.length && !courses.length && (
          <p className="small muted">이 날짜에 등록된 일정이 없어요.</p>
        )}
      </section>
    </>
  )
}
