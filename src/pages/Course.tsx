import { lazy, Suspense, useMemo, useState } from 'react'
import type {
  Course,
  CourseSettings,
  CourseStop,
  Event,
  Place,
} from '@/domain/models'
import { companions } from '@/domain/models'
import { CategoryIcon, CompanionIcon } from '@/components/Brand'
import { Modal } from '@/components/Modal'
import { Calendar } from '@/components/Calendar'
import { PlaceInformation } from './Events'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { dateKey, priceText, recalculate, schedule } from '@/domain/planning'
import { safeUrl } from '@/domain/validation'
import { api, isDemo } from '@/services/api'
import { calendarDemoEvents, designCourse } from '@/data/scenarios'
import { isRealCourse } from '@/domain/realCourse'
import { livePlaces } from '@/services/places'
import { PlacePhoto } from '@/components/PlacePhoto'
const PlaceMap = lazy(() => import('@/components/PlaceMap'))

function defaultSettings(
  event: Event,
  date: string,
  companion?: CourseSettings['companion'],
  freeOnly = false,
): CourseSettings {
  return {
    date: date || dateKey(new Date(event.startsAt)),
    companion: companion ?? '아이와',
    childAge: null,
    transport: '자가용',
    origin: '',
    originLocation: null,
    startTime: '10:00',
    endTime: '17:00',
    budget: freeOnly ? 0 : null,
    activities: ['먹거리', '체험', '휴식'],
  }
}
export function Configure({ event }: { event: Event }) {
  const app = useApp()
  const [settings, setSettings] = useState<CourseSettings>(() =>
    app.setup?.eventId === event.id
      ? app.setup.settings
      : app.draft?.eventId === event.id
        ? app.draft.settings
        : defaultSettings(
            event,
            app.filters.date,
            app.filters.companions[0],
            app.filters.freeOnly,
          ),
  )
  const busy = false
  const [error, setError] = useState('')
  const set = <K extends keyof CourseSettings>(
    key: K,
    value: CourseSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }))
  const generate = async () => {
    setError('')
    if (!settings.origin.trim()) {
      setError('출발지를 직접 입력하거나 내 위치를 선택해 주세요.')
      document.getElementById('origin')?.focus()
      return
    }
    if (
      !settings.date ||
      !settings.startTime ||
      !settings.endTime ||
      settings.startTime >= settings.endTime
    ) {
      setError('방문 날짜와 시작·종료 시간을 확인해 주세요.')
      return
    }
    if (settings.companion === '아이와' && settings.childAge === null) {
      setError('함께하는 아이의 나이를 입력해 주세요.')
      document.getElementById('child-age')?.focus()
      return
    }
    if (!app.data) return
    app.setSetup({ eventId: event.id, settings })
    app.setGeneration({ id: crypto.randomUUID(), eventId: event.id, settings })
    go(`/generating/${event.id}`)
  }

  return (
    <>
      <h1 className="blue">어떤 하루를 보낼까요?</h1>
      <p className="small muted">
        선택한 {event.name}을 기준으로 일정을 생성합니다.
      </p>
      <ol className="steps">
        {['검색', '행사 리스트', '행사 상세', '세부 설정', '하루 일정'].map(
          (s, i) => (
            <li key={s} className={i === 3 ? 'current' : ''}>
              {s}
            </li>
          ),
        )}
      </ol>
      <section className="panel tinted">
        <p className="eyebrow">선택한 행사</p>
        <h2>{event.name}</h2>
        <p className="small muted">⌖ {event.venue}</p>
      </section>
      <form
        id="configure-form"
        className="panel form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          void generate()
        }}
      >
        <fieldset>
          <legend>누구와 함께하나요?</legend>
          <div className="chips">
            {companions.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${settings.companion === c ? 'active' : ''}`}
                aria-pressed={settings.companion === c}
                onClick={() => set('companion', c)}
              >
                <CompanionIcon companion={c} />
                {c}
              </button>
            ))}
          </div>
          {settings.companion === '아이와' && (
            <label className="field">
              아이 나이
              <input
                id="child-age"
                type="number"
                min="0"
                max="18"
                required
                value={settings.childAge ?? ''}
                placeholder="만 나이"
                onChange={(e) =>
                  set(
                    'childAge',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </label>
          )}
        </fieldset>
        <fieldset>
          <legend>어디에서 출발하나요?</legend>
          <div className="row">
            <input
              id="origin"
              aria-label="출발지"
              required
              maxLength={200}
              value={settings.origin}
              placeholder="출발지 주소 또는 장소"
              onChange={(e) =>
                setSettings({
                  ...settings,
                  origin: e.target.value,
                  originLocation: null,
                })
              }
            />
            <button
              type="button"
              className="secondary nowrap"
              disabled={app.locating}
              onClick={() =>
                void app
                  .locate()
                  .then((coordinate) =>
                    setSettings({
                      ...settings,
                      origin: '현재 위치',
                      originLocation: coordinate,
                    }),
                  )
                  .catch(() => {
                    document.getElementById('origin')?.focus()
                  })
              }
            >
              {app.locating ? '확인 중…' : '⌖ 내 위치'}
            </button>
          </div>
          <a
            className="text-button small"
            href={`#/origin/${event.id}`}
            onClick={() => app.setSetup({ eventId: event.id, settings })}
          >
            출발지 직접 설정하기 →
          </a>
          <p className="tiny muted">
            주소는 연결된 서버에서 좌표로 확인해요. 시연 모드의 직접 입력 장소는
            지도에 임의 표시하지 않아요.
          </p>
          {app.locationError && (
            <p className="error small" role="alert">
              {app.locationError}
            </p>
          )}
        </fieldset>
        <fieldset>
          <legend>어떻게 이동하나요?</legend>
          <div className="chips">
            {(['자가용', '대중교통', '도보'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${settings.transport === t ? 'active' : ''}`}
                aria-pressed={settings.transport === t}
                onClick={() => set('transport', t)}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>언제, 얼마나 머무를까요?</legend>
          <label className="field">
            방문 날짜
            <input
              type="date"
              required
              value={settings.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </label>
          <div className="row">
            <label className="field grow">
              시작
              <input
                type="time"
                required
                value={settings.startTime}
                onChange={(e) => set('startTime', e.target.value)}
              />
            </label>
            <label className="field grow">
              종료
              <input
                type="time"
                required
                value={settings.endTime}
                onChange={(e) => set('endTime', e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>예산은 어떻게 할까요?</legend>
          <div className="chips">
            <button
              type="button"
              className={`chip ${settings.budget === null ? 'active' : ''}`}
              aria-pressed={settings.budget === null}
              onClick={() => set('budget', null)}
            >
              상관없음
            </button>
            <button
              type="button"
              className={`chip ${settings.budget === 0 ? 'active' : ''}`}
              aria-pressed={settings.budget === 0}
              onClick={() => set('budget', 0)}
            >
              무료만
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>하고 싶은 것을 골라 주세요</legend>
          <div className="chips">
            {['먹거리', '체험', '휴식', '공연'].map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${settings.activities.includes(a) ? 'active' : ''}`}
                aria-pressed={settings.activities.includes(a)}
                onClick={() =>
                  set(
                    'activities',
                    settings.activities.includes(a)
                      ? settings.activities.filter((v) => v !== a)
                      : [...settings.activities, a],
                  )
                }
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
      <p className="info small">
        이동시간은 좌표 간 직선거리 기반 추정이며 실제 도로·교통 상황과 달라요.
      </p>
      <div className="sticky-action">
        <button
          form="configure-form"
          className="primary"
          type="submit"
          disabled={busy}
        >
          {busy ? '하루 일정을 구성하고 있어요…' : '일정 만들기 →'}
        </button>
      </div>
    </>
  )
}

export function Itinerary({
  course,
  shared = false,
}: {
  course: Course
  shared?: boolean
}) {
  const app = useApp()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragged, setDragged] = useState<string | null>(null)
  const items = schedule(course)
  const real = isRealCourse(course)
  const cost = course.stops.reduce((n, s) => n + (s.place?.price ?? 0), 0)
  const unknown = course.stops.some((s) => s.place?.price === null)
  const commit = async (stops: CourseStop[]) => {
    if (!stops.length) {
      setError('일정은 하나 이상 남겨 주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const next = { ...course, stops }
      const result =
        real || isDemo || shared
          ? recalculate(next)
          : await api.recalculateCourse(next)
      app.storeDraft(result)
      if (app.courses.some((c) => c.id === result.id)) app.saveCourse(result)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '수정 내용을 반영하지 못했어요.',
      )
    } finally {
      setBusy(false)
    }
  }
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= course.stops.length || from === to) return
    const next = [...course.stops]
    const [stop] = next.splice(from, 1)
    next.splice(to, 0, stop)
    void commit(next)
  }
  const candidates: Place[] = [
    ...(app.data?.places ?? []),
    ...(app.data?.events.filter(
      (e) =>
        dateKey(new Date(e.startsAt)) <= course.settings.date &&
        dateKey(new Date(e.endsAt)) >= course.settings.date,
    ) ?? []),
  ].filter(
    (p) =>
      (course.settings.budget !== 0 || p.price === 0) &&
      !course.stops.some((s) => s.place?.id === p.id),
  )
  return (
    <>
      <h1 className="blue">추천 하루 일정</h1>
      <p className="small muted">
        {course.settings.date} · {course.settings.companion} ·{' '}
        {course.settings.transport} · {course.settings.startTime}–
        {course.settings.endTime}
      </p>
      <section className="panel tinted">
        <h2 className="h3">✦ {course.name}</h2>
        <p className="small muted">
          {course.eventId.startsWith('team:')
            ? '공식 행사 일정의 브라우저 편집본입니다. 영업 시간·요금과 실제 장소 정보는 방문 전 공식 출처에서 확인해 주세요.'
            : real
              ? '선택한 실제 장소와 주변 음식점·카페를 연결했어요. 체류 시간은 수정 가능한 계획이며 영업 시간·요금은 방문 전 확인해 주세요.'
              : '선택한 곳 주변의 맛집·볼거리를 시간과 취향에 맞춰 연결했어요.'}
        </p>
      </section>
      {course.notes?.map((note, index) => (
        <p className="info small" key={index}>
          {note}
        </p>
      ))}
      {items.some((s) => s.overflows) && (
        <p className="warning" role="alert">
          일정이 종료 시간 {course.settings.endTime}을 넘어요. 항목을 줄이거나
          조건을 변경해 주세요.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p className="info small" role="status">
          수정한 일정을 다시 계산하고 있어요…
        </p>
      )}
      <div className="timeline">
        {items.map((stop, i) => (
          <article
            className={`stop-card ${stop.overflows ? 'overflow' : ''}`}
            key={stop.id}
            draggable={!shared && !busy}
            onDragStart={(e) => {
              setDragged(stop.id)
              e.dataTransfer.setData('text/plain', stop.id)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragged)
                move(
                  course.stops.findIndex((s) => s.id === dragged),
                  i,
                )
              setDragged(null)
            }}
          >
            <div className="row stop-main">
              {real && stop.place ? (
                <PlacePhoto
                  name={stop.place.name}
                  image={stop.place}
                  className="stop-photo"
                  placeholder
                />
              ) : stop.place && safeUrl(stop.place.imageUrl) ? (
                <img
                  className="stop-image"
                  src={safeUrl(stop.place.imageUrl)}
                  alt={`${stop.title} 예시 사진`}
                />
              ) : (
                <span className="stop-placeholder">
                  <span className="number-badge">{i + 1}</span>
                </span>
              )}
              <div className="grow">
                <p className="tiny muted">
                  {stop.place || stop.kind === 'return'
                    ? `${stop.start} — ${stop.end}`
                    : '정보 확인 후 추가'}{' '}
                  ·{' '}
                  {
                    {
                      arrival: real ? '방문 장소' : '행사 도착',
                      program: '프로그램',
                      meal: '먹거리',
                      nearby: real ? '카페·주변 장소' : '근처 행사',
                      return: '귀가',
                      custom: '직접 입력',
                    }[stop.kind]
                  }
                </p>
                <h2>{stop.title}</h2>
              </div>
            </div>
            {stop.missingReason && (
              <p className="small muted">{stop.missingReason}</p>
            )}
            {stop.place && (
              <div className="badges soft">
                <span>{priceText(stop.place.price)}</span>
                <span>{stop.durationMinutes}분</span>
              </div>
            )}
            {real && stop.place && (
              <a
                className="small blue"
                href={safeUrl(stop.place.source.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                주소·영업 정보 확인 ↗
              </a>
            )}
            {real && !shared && (
              <label className="field small">
                {stop.title} 체류 시간(분)
                <input
                  type="number"
                  min={15}
                  max={480}
                  defaultValue={stop.durationMinutes}
                  key={`${stop.id}-${stop.durationMinutes}`}
                  onBlur={(event) => {
                    const duration = Number(event.target.value)
                    if (
                      !Number.isInteger(duration) ||
                      duration < 15 ||
                      duration > 480
                    ) {
                      setError('체류 시간은 15~480분으로 입력해 주세요.')
                      event.target.value = String(stop.durationMinutes)
                      return
                    }
                    if (duration !== stop.durationMinutes)
                      void commit(
                        course.stops.map((item) =>
                          item.id === stop.id
                            ? { ...item, durationMinutes: duration }
                            : item,
                        ),
                      )
                  }}
                />
              </label>
            )}
            <p className="tiny muted">
              이동{' '}
              {stop.travelMinutes === null
                ? '정보 없음'
                : `${stop.travelMinutes}분 · 직선거리 기반 추정`}
            </p>
            {stop.kind === 'return' && <ReturnDirections course={course} />}
            <div className="stop-actions">
              {!shared && (
                <>
                  <a
                    className={
                      stop.kind === 'return'
                        ? 'disabled-link text-button'
                        : 'text-button'
                    }
                    href={
                      stop.kind === 'return'
                        ? undefined
                        : real
                          ? `#/plan/${course.id}`
                          : `#/replace/${course.id}?stop=${encodeURIComponent(stop.id)}`
                    }
                  >
                    ↻ 교체
                  </a>
                  {!real && (
                    <a
                      className={
                        stop.kind === 'return'
                          ? 'disabled-link text-button'
                          : 'text-button'
                      }
                      href={
                        stop.kind === 'return'
                          ? undefined
                          : `#/manual/${course.id}?stop=${encodeURIComponent(stop.id)}`
                      }
                    >
                      ✎ 직접 입력
                    </a>
                  )}
                  <div className="row reorder">
                    <button
                      type="button"
                      aria-label={`${stop.title} 위로 이동`}
                      disabled={busy || i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${stop.title} 아래로 이동`}
                      disabled={busy || i === items.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`${stop.title} 삭제`}
                      disabled={
                        busy || (real && stop.place?.id === course.eventId)
                      }
                      onClick={() =>
                        void commit(
                          course.stops.filter((s) => s.id !== stop.id),
                        )
                      }
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="row between">
          <span>확인된 요금 합계</span>
          <strong className="blue">
            {real ? '방문 전 확인 필요' : priceText(cost)}
            {!real && unknown ? ' + 미확인 요금' : ''}
          </strong>
        </div>
        <p className="tiny muted">미확인 요금·인원별 요금·교통비는 별도예요.</p>
      </section>
      {!shared && !real && (
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={() => setAdding(true)}
        >
          + 일정에 장소 추가
        </button>
      )}
      <a className="secondary" href={`#/course-map/${course.id}`}>
        ⌖ 지도에서 동선 확인하기
      </a>
      <p className="tiny muted">
        점선은 방문 순서이며 실제 도로 경로가 아닙니다. 이동시간은 직선거리 기반
        추정이에요.
      </p>
      <div className="sticky-action two">
        {shared ? (
          <button
            className="secondary"
            type="button"
            onClick={() => {
              const imported = { ...course, id: crypto.randomUUID() }
              app.storeDraft(imported)
              go(`/course/${imported.id}`)
            }}
          >
            내 일정으로 가져오기
          </button>
        ) : (
          <a
            className="secondary"
            href={
              real ? `#/plan/${course.id}` : `#/configure/${course.eventId}`
            }
          >
            조건 바꾸기
          </a>
        )}
        <a className="primary" href={`#/share/${course.id}`}>
          저장 · 공유 ↗
        </a>
      </div>
      {adding && (
        <Modal title="일정에 장소 추가" onClose={() => setAdding(false)}>
          {candidates.map((p) => (
            <button
              className="candidate"
              key={p.id}
              type="button"
              onClick={() => {
                const added: CourseStop = {
                  id: crypto.randomUUID(),
                  kind: 'custom',
                  title: p.name,
                  place: p,
                  durationMinutes: p.durationMinutes,
                  travelMinutes: null,
                  missingReason: null,
                }
                void commit([
                  ...course.stops.slice(0, -1),
                  added,
                  ...course.stops.slice(-1),
                ])
                setAdding(false)
              }}
            >
              <strong>{p.name}</strong>
              <small>
                {priceText(p.price)} · {p.durationMinutes}분
              </small>
            </button>
          ))}
          {!candidates.length && (
            <p className="info small">조건에 맞는 추가 후보가 없어요.</p>
          )}
        </Modal>
      )}
    </>
  )
}
function ReturnDirections({ course }: { course: Course }) {
  const last = [...course.stops]
    .reverse()
    .find((s) => s.kind !== 'return' && s.place?.location)?.place
  const end = course.settings.originLocation
  if (!last?.location || !end)
    return (
      <p className="tiny muted">
        출발지 좌표가 없어요. 카카오맵에서 귀가 목적지를 직접 입력해 주세요.{' '}
        <a
          className="blue"
          href="https://map.kakao.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          카카오맵 열기 ↗
        </a>
      </p>
    )
  const mode = { 자가용: 'car', 대중교통: 'traffic', 도보: 'walk' }[
    course.settings.transport
  ]
  const url = `https://map.kakao.com/link/by/${mode}/${encodeURIComponent(last.name)},${last.location.lat},${last.location.lng}/${encodeURIComponent(course.settings.origin || '출발지')},${end.lat},${end.lng}`
  return (
    <a
      className="blue small"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      카카오맵 귀가 길찾기 ↗ · {course.settings.transport}
    </a>
  )
}
export function CourseMap({
  course,
  event,
}: {
  course?: Course
  event?: Event
}) {
  const app = useApp()
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const places = useMemo(
    () =>
      event
        ? [event]
        : (course?.stops.flatMap((s) => (s.place ? [s.place] : [])) ?? []),
    [course, event],
  )
  const selected = places.find((p) => p.id === selectedId)
  return (
    <>
      <h1 className="blue">
        {course ? '하루의 흐름을 한눈에' : '여기에서 만나요'}
      </h1>
      <Suspense fallback={<p className="info">지도를 준비하고 있어요…</p>}>
        <PlaceMap
          places={places}
          current={app.location}
          connect={!!course}
          selectedId={selectedId}
          onSelect={(p) => setSelectedId(p.id)}
        />
      </Suspense>
      <button
        type="button"
        className="secondary"
        disabled={app.locating}
        onClick={() => void app.locate().catch(() => {})}
      >
        {app.locating ? '위치 확인 중…' : '⌖ 내 위치 표시'}
      </button>
      {app.locationError && <p className="error small">{app.locationError}</p>}
      {selected && <PlaceInformation place={selected} />}
      {places.map((p, i) => (
        <button
          className={`place-list-item ${p.id === selectedId ? 'active' : ''}`}
          type="button"
          key={`${p.id}-${i}`}
          onClick={() => setSelectedId(p.id)}
        >
          <span className="number-badge">{i + 1}</span>
          <span>
            <strong>{p.name}</strong>
            <small>
              {p.location ? '위치 정보 확인' : '좌표 정보 없음'} ·{' '}
              {priceText(p.price)}
            </small>
          </span>
          <span>›</span>
        </button>
      ))}
      <p className="small muted">
        마커나 목록을 누르면 주소·운영 시간·요금·출처를 확인할 수 있어요.
      </p>
      {course && (
        <p className="info small">
          점선은 실제 도로 경로가 아닌 방문 순서입니다. 좌표가 없는 일정은
          지도에 표시하지 않아요.
        </p>
      )}
      {course && isRealCourse(course) && (
        <section className="panel stack">
          <h2>구간별 실제 길찾기</h2>
          {places.slice(1).map((place, index) => {
            const from = places[index]
            const mode = { 자가용: 'car', 도보: 'walk', 대중교통: 'traffic' }[
              course.settings.transport
            ]
            if (!from.location || !place.location) return null
            const url = `https://map.kakao.com/link/by/${mode}/${encodeURIComponent(from.name)},${from.location.lat},${from.location.lng}/${encodeURIComponent(place.name)},${place.location.lat},${place.location.lng}`
            return (
              <a
                key={`${from.id}-${place.id}-${index}`}
                className="small blue"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {index + 1}. {from.name} → {place.name} · 카카오맵 길찾기 ↗
              </a>
            )
          })}
        </section>
      )}
    </>
  )
}
export function Saved({ standalone = false }: { standalone?: boolean }) {
  const app = useApp()
  const [selectedDate, setSelectedDate] = useState(
    app.preview && app.courses.length ? '2026-11-14' : '',
  )
  const courses = app.courses.filter(
    (c) => !selectedDate || c.settings.date === selectedDate,
  )
  return (
    <>
      <p
        className={
          app.courses.length ? 'saved-eyebrow' : 'eyebrow saved-eyebrow'
        }
      >
        MY LITTLE TRIPS
      </p>
      {standalone && <h1 className="blue">다시 꺼내 보는, 나의 하루</h1>}
      {!standalone && app.courses.length > 0 && (
        <>
          <Calendar
            showRanges
            selected={selectedDate}
            onSelect={setSelectedDate}
            events={
              app.preview
                ? calendarDemoEvents
                : livePlaces
                  ? []
                  : app.data?.events
            }
            anchor={app.courses[0].settings.date}
          />
          <a className="text-button small align-right" href="#/calendar">
            월간 행사 캘린더 →
          </a>
        </>
      )}
      {!courses.length ? (
        <section className="empty-state saved-empty">
          <span className="empty-map" aria-hidden="true">
            🗺
          </span>
          <p className="saved-empty-caption">
            {selectedDate
              ? '이 날의 저장된 코스가 없어요'
              : '아직 저장한 코스가 없어요'}
          </p>
          <a className="primary" href="#/">
            갈 곳 찾으러 가기 →
          </a>
          {isDemo && !livePlaces && (
            <button
              className="secondary"
              type="button"
              onClick={() => {
                const sample = designCourse()
                app.storeDraft(sample)
                app.setCourses([sample])
                app.setToast('시연용 저장 상태입니다.')
              }}
            >
              저장 상태 체험하기
            </button>
          )}
          {selectedDate && (
            <button
              className="text-button"
              type="button"
              onClick={() => setSelectedDate('')}
            >
              모든 코스 보기
            </button>
          )}
        </section>
      ) : (
        courses.map((c) => (
          <article className="panel stack saved-course-card" key={c.id}>
            {!standalone && (
              <p className="eyebrow">저장한 코스 {courses.length}개</p>
            )}
            {isRealCourse(c) && c.stops[0]?.place ? (
              <PlacePhoto
                name={c.stops[0].place.name}
                image={c.stops[0].place}
                className="saved-photo"
              />
            ) : (
              c.stops[0]?.place?.imageUrl && (
                <img
                  className="saved-image"
                  src={safeUrl(c.stops[0].place.imageUrl)}
                  alt={c.name}
                />
              )
            )}
            <div className="row">
              <CategoryIcon category="park" size={28} />
              <h2>{c.name}</h2>
            </div>
            <p className="small muted">
              {c.settings.date} · {c.settings.companion} ·{' '}
              {c.settings.transport} · {c.stops.filter((s) => s.place).length}개
              일정
            </p>
            <p className="small blue row">
              <CategoryIcon category="food" size={20} />
              {c.stops.find((s) => s.kind === 'meal')?.title ??
                '식사 계획 미정'}
            </p>
            <a className="primary" href={`#/course/${c.id}`}>
              코스 열기 →
            </a>
            <a
              className="text-button small muted"
              href={`#/delete-course/${c.id}`}
            >
              저장한 코스 삭제
            </a>
          </article>
        ))
      )}
      <p className="tiny muted">저장한 코스는 이 브라우저에 보관됩니다.</p>
      {app.favorites.length > 0 && (
        <section className="panel stack">
          <h2>관심 행사</h2>
          {app.data?.events
            .filter((e) => app.favorites.includes(e.id))
            .map((e) => (
              <a className="list-link" key={e.id} href={`#/events/${e.id}`}>
                {e.name}
                <span>›</span>
              </a>
            ))}
        </section>
      )}
    </>
  )
}
