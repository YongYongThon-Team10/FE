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
import {
  dateKey,
  makeDemoCourse,
  priceText,
  recalculate,
  schedule,
} from '@/domain/planning'
import { safeUrl } from '@/domain/validation'
import { api, isDemo } from '@/services/api'
import { courseSnapshot } from '@/domain/snapshots'
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
    app.draft?.eventId === event.id
      ? app.draft.settings
      : defaultSettings(
          event,
          app.filters.date,
          app.filters.companions[0],
          app.filters.freeOnly,
        ),
  )
  const [busy, setBusy] = useState(false)
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
    setBusy(true)
    try {
      const resolved =
        !isDemo && !settings.originLocation
          ? { ...settings, originLocation: await api.geocode(settings.origin) }
          : settings
      const course = isDemo
        ? makeDemoCourse(event, app.data, resolved)
        : await api.generateCourse(event.id, resolved)
      app.storeDraft(course)
      go(`/course/${course.id}`)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '일정을 만들지 못했어요. 다시 시도해 주세요.',
      )
    } finally {
      setBusy(false)
    }
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

function shareUrl(course: Course): string {
  const clean = courseSnapshot(course, true)
  const bytes = new TextEncoder().encode(JSON.stringify(clean))
  const encoded = btoa(
    Array.from(bytes, (b) => String.fromCharCode(b)).join(''),
  )
  if (encoded.length > 24000)
    throw new Error('공유할 일정이 너무 길어요. 항목을 줄여 주세요.')
  return `${window.location.origin}${window.location.pathname}#/shared?data=${encodeURIComponent(encoded)}`
}
export function Itinerary({
  course,
  shared = false,
}: {
  course: Course
  shared?: boolean
}) {
  const app = useApp()
  const [modal, setModal] = useState<'share' | 'add' | null>(null)
  const [editing, setEditing] = useState<CourseStop | null>(null)
  const [manual, setManual] = useState<CourseStop | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const [dragged, setDragged] = useState<string | null>(null)
  const items = schedule(course)
  const price = course.stops.reduce(
    (total, s) => total + (s.place?.price ?? 0),
    0,
  )
  const unknownPrice = course.stops.some((s) => s.place?.price === null)
  const commit = async (stops: CourseStop[]) => {
    if (!stops.length) {
      setError('일정은 하나 이상 남겨 주세요.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const next = { ...course, stops }
      const result =
        isDemo || shared ? recalculate(next) : await api.recalculateCourse(next)
      app.storeDraft(result)
      if (app.courses.some((c) => c.id === result.id)) app.saveCourse(result)
      go(`/course/${result.id}`)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '수정 내용을 반영하지 못했어요.',
      )
    } finally {
      setBusy(false)
    }
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= course.stops.length || from === to) return
    const next = [...course.stops]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    void commit(next)
  }
  const replace = (place: Place) => {
    if (!editing) return
    void commit(
      course.stops.map((s) =>
        s.id === editing.id
          ? {
              ...s,
              title: place.name,
              place,
              durationMinutes: place.durationMinutes,
              missingReason: null,
            }
          : s,
      ),
    )
    setEditing(null)
  }
  const candidatePool: Place[] = app.data
    ? [
        ...app.data.events.filter(
          (e) =>
            dateKey(new Date(e.startsAt)) <= course.settings.date &&
            dateKey(new Date(e.endsAt)) >= course.settings.date,
        ),
        ...app.data.places,
      ]
    : []
  const candidates = candidatePool
    .filter(
      (p) =>
        (!editing ||
          (editing.kind === 'meal'
            ? p.category === 'food'
            : editing.place === null ||
              p.category === editing.place.category)) &&
        (course.settings.budget !== 0 || p.price === 0) &&
        !course.stops.some((s) => s.id !== editing?.id && s.place?.id === p.id),
    )
    .slice(0, 3)
  const openShare = () => {
    setError('')
    setLink('')
    setModal('share')
  }
  const makeShare = async () => {
    try {
      const url = shareUrl(course)
      setLink(url)
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url)
          app.setToast('공유 링크를 복사했어요.')
        } catch {
          setError(
            '자동 복사를 사용할 수 없어요. 아래 공유 링크를 직접 복사해 주세요.',
          )
        }
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '링크를 복사하지 못했어요. 아래 링크를 직접 복사해 주세요.',
      )
    }
  }
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
          선택한 행사와 주변의 즐길 거리를 한 번에 만나 보세요.
        </p>
      </section>
      {course.isDemo && (
        <p className="info small">
          시연용 후보로 구성한 일정이에요. 장소·요금·좌표는 실측 데이터가
          아닙니다.
        </p>
      )}
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
        <p role="status" className="info small">
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
              {stop.place && safeUrl(stop.place.imageUrl) ? (
                <img
                  className="stop-image"
                  src={safeUrl(stop.place.imageUrl)}
                  alt={`${stop.title} 예시 사진`}
                />
              ) : (
                <span className="stop-placeholder">
                  <span className="number-badge">{i + 1}</span>
                  {stop.place && (
                    <CategoryIcon category={stop.place.category} size={32} />
                  )}
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
                      arrival: '행사 도착',
                      program: '프로그램',
                      meal: '먹거리',
                      nearby: '근처 행사',
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
            <p className="tiny muted">
              이동{' '}
              {stop.travelMinutes === null
                ? '정보 없음'
                : `${stop.travelMinutes}분 · 직선거리 기반 추정`}
            </p>
            {stop.kind === 'return' && <ReturnDirections course={course} />}
            {!shared && (
              <div className="stop-actions">
                <button
                  type="button"
                  disabled={busy || stop.kind === 'return'}
                  className="text-button"
                  onClick={() => setEditing(stop)}
                >
                  ↻ 교체
                </button>
                <button
                  type="button"
                  disabled={busy || stop.kind === 'return'}
                  className="text-button"
                  onClick={() => setManual(stop)}
                >
                  ✎ 직접 입력
                </button>
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
                    disabled={busy}
                    aria-label={`${stop.title} 삭제`}
                    onClick={() =>
                      void commit(course.stops.filter((s) => s.id !== stop.id))
                    }
                  >
                    삭제
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="row between">
          <span>예상 합계</span>
          <strong className="blue">
            {priceText(price)}
            {unknownPrice ? ' + 미확인 요금' : ''}
          </strong>
        </div>
        <p className="tiny muted">
          인원별 요금·교통비는 별도예요. 각 장소의 실제 안내를 확인해 주세요.
        </p>
      </section>
      {!shared && (
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={() => setModal('add')}
        >
          + 일정에 장소 추가
        </button>
      )}
      <a
        className="secondary"
        href={`#/course-map/${encodeURIComponent(course.id)}`}
      >
        ⌖ 지도에서 동선 확인하기
      </a>
      <p className="tiny muted">
        점선은 방문 순서예요. 실제 도로 경로가 아니며 이동시간은 직선거리 기반
        추정입니다.
      </p>
      <div className="sticky-action two">
        {shared ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const imported = { ...course, id: crypto.randomUUID() }
              app.storeDraft(imported)
              go(`/course/${imported.id}`)
            }}
          >
            내 일정으로 가져오기
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() =>
              go(`/configure/${encodeURIComponent(course.eventId)}`)
            }
          >
            조건 바꾸기
          </button>
        )}
        <button type="button" className="primary" onClick={openShare}>
          저장 · 공유 ↗
        </button>
      </div>
      {modal === 'share' && (
        <Modal title="우리의 하루를 함께" onClose={() => setModal(null)}>
          <p className="small muted">
            이 브라우저에 저장하거나 링크로 일정을 공유해 보세요.
          </p>
          <button
            className="primary"
            type="button"
            onClick={() => app.saveCourse(course)}
          >
            내 코스에 저장
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => void makeShare()}
          >
            공유 링크 만들기 · 복사
          </button>
          {link && (
            <label className="field">
              공유 링크
              <textarea
                aria-label="공유 링크"
                readOnly
                value={link}
                rows={3}
                onFocus={(e) => e.target.select()}
              />
            </label>
          )}
          <p className="tiny muted">
            공유 링크에는 출발지와 현재 위치가 포함되지 않아요. 공유 시점의
            일정이 전달되며 이후 수정은 반영되지 않아요.
          </p>
          {error && (
            <p className="error small" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {editing && (
        <Modal title="다른 장소로 바꿔볼까요?" onClose={() => setEditing(null)}>
          {candidates.length ? (
            candidates.map((p) => (
              <button
                className="candidate"
                key={p.id}
                type="button"
                onClick={() => replace(p)}
              >
                <span className="row">
                  <CategoryIcon category={p.category} />
                  <strong>{p.name} →</strong>
                </span>
                <span className="small blue">
                  {p.durationMinutes}분 · {priceText(p.price)}
                </span>
                <small className="muted">{p.description}</small>
              </button>
            ))
          ) : (
            <p className="info">
              같은 조건에 맞는 후보가 없어요. 직접 입력하거나 조건을 변경해
              주세요.
            </p>
          )}
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setManual(editing)
              setEditing(null)
            }}
          >
            장소 직접 입력 →
          </button>
        </Modal>
      )}
      {modal === 'add' && (
        <Modal title="일정에 장소 추가" onClose={() => setModal(null)}>
          {candidatePool
            .filter(
              (p) =>
                (course.settings.budget !== 0 || p.price === 0) &&
                !course.stops.some((s) => s.place?.id === p.id),
            )
            .map((p) => (
              <button
                className="candidate"
                key={p.id}
                type="button"
                onClick={() => {
                  void commit([
                    ...course.stops.slice(0, -1),
                    {
                      id: crypto.randomUUID(),
                      kind: 'custom',
                      title: p.name,
                      place: p,
                      durationMinutes: p.durationMinutes,
                      travelMinutes: null,
                      missingReason: null,
                    },
                    ...course.stops.slice(-1),
                  ])
                  setModal(null)
                }}
              >
                <strong>{p.name}</strong>
                <small>
                  {priceText(p.price)} · {p.durationMinutes}분
                </small>
              </button>
            ))}
        </Modal>
      )}
      {manual && (
        <ManualPlace
          stop={manual}
          onClose={() => setManual(null)}
          onSave={(place) => {
            void commit(
              course.stops.map((s) =>
                s.id === manual.id
                  ? {
                      ...s,
                      title: place.name,
                      place,
                      durationMinutes: place.durationMinutes,
                      missingReason: null,
                    }
                  : s,
              ),
            )
            setManual(null)
          }}
        />
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
function ManualPlace({
  stop,
  onSave,
  onClose,
}: {
  stop: CourseStop
  onSave: (place: Place) => void
  onClose: () => void
}) {
  const [name, setName] = useState(stop.place?.name ?? '')
  const [address, setAddress] = useState(stop.place?.address ?? '')
  const [duration, setDuration] = useState(stop.durationMinutes || 45)
  const [price, setPrice] = useState<number | ''>(stop.place?.price ?? '')
  return (
    <Modal title="장소 직접 입력" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          onSave({
            id: crypto.randomUUID(),
            name: name.trim(),
            address: address.trim(),
            description: '사용자가 직접 추가한 장소',
            category:
              stop.place?.category ??
              (stop.kind === 'meal' ? 'food' : 'culture'),
            district: '',
            location: null,
            imageUrl: null,
            price: price === '' ? null : price,
            durationMinutes: duration,
            openingHours: '정보 없음',
            source: {
              name: '직접 입력',
              url: null,
              updatedAt: new Date().toISOString(),
              isDemo: false,
            },
          })
        }}
      >
        <label className="field">
          장소 이름
          <input
            value={name}
            required
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          주소
          <input
            value={address}
            maxLength={200}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <label className="field">
          머무는 시간 (분)
          <input
            type="number"
            required
            min="1"
            max="720"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <label className="field">
          요금 (원 · 모르면 비워 두세요)
          <input
            type="number"
            min="0"
            max="10000000"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </label>
        <p className="tiny muted">
          직접 입력한 장소는 좌표가 확인되기 전까지 지도에 표시하지 않아요.
        </p>
        <button type="submit" className="primary">
          일정에 반영하기
        </button>
      </form>
    </Modal>
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
    </>
  )
}
export function Saved() {
  const app = useApp()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const courses = app.courses.filter(
    (c) => !selectedDate || c.settings.date === selectedDate,
  )
  return (
    <>
      <div className="row between">
        <p className="eyebrow">MY LITTLE TRIPS</p>
        <a href="#/settings" className="blue small">
          설정 ···
        </a>
      </div>
      {app.courses.length > 0 && (
        <Calendar
          selected={selectedDate}
          onSelect={setSelectedDate}
          events={app.data?.events}
          anchor={app.courses[0].settings.date}
        />
      )}
      {!courses.length ? (
        <section className="empty-state saved-empty">
          <CategoryIcon category="park" size={40} />
          <h2>
            {selectedDate
              ? '이 날의 저장된 코스가 없어요'
              : '아직 저장한 코스가 없어요'}
          </h2>
          <p className="small muted">
            마음에 드는 행사에서 우리의 하루를 시작해 보세요.
          </p>
          <a href="#/" className="primary">
            갈 곳 찾으러 가기 →
          </a>
          {selectedDate && (
            <button
              type="button"
              className="secondary"
              onClick={() => setSelectedDate('')}
            >
              모든 코스 보기
            </button>
          )}
        </section>
      ) : (
        courses.map((c) => (
          <article className="panel stack" key={c.id}>
            <p className="eyebrow">
              저장한 코스 · {c.stops.filter((s) => s.place).length}개 장소
            </p>
            {c.stops[0]?.place?.imageUrl && (
              <img
                className="saved-image"
                src={safeUrl(c.stops[0].place.imageUrl)}
                alt={c.name}
              />
            )}
            <h2>{c.name}</h2>
            <p className="small muted">
              {c.settings.date} · {c.settings.companion} ·{' '}
              {c.settings.transport}
            </p>
            <a
              className="primary"
              href={`#/course/${encodeURIComponent(c.id)}`}
            >
              코스 열기 ↗
            </a>
            <button
              className="text-button danger"
              type="button"
              onClick={() => setDeleteId(c.id)}
            >
              코스 삭제
            </button>
          </article>
        ))
      )}
      <p className="tiny muted">
        저장한 코스는 이 브라우저에 보관됩니다. 다른 기기와의 동기화는 아직
        연결되지 않았어요.
      </p>
      {app.favorites.length > 0 && (
        <section className="panel stack">
          <h2>관심 행사</h2>
          {app.data?.events
            .filter((e) => app.favorites.includes(e.id))
            .map((e) => (
              <a
                className="list-link"
                key={e.id}
                href={`#/events/${encodeURIComponent(e.id)}`}
              >
                {e.name}
                <span>›</span>
              </a>
            ))}
        </section>
      )}
      {deleteId && (
        <Modal title="이 코스를 삭제할까요?" onClose={() => setDeleteId(null)}>
          <p className="small muted">이 브라우저에 저장한 코스가 삭제됩니다.</p>
          <button
            className="primary danger-fill"
            type="button"
            onClick={() => {
              app.setCourses(app.courses.filter((c) => c.id !== deleteId))
              setDeleteId(null)
            }}
          >
            삭제하기
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => setDeleteId(null)}
          >
            취소
          </button>
        </Modal>
      )}
    </>
  )
}
