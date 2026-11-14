import { useEffect, useRef, useState } from 'react'
import { SERVICE_NAME } from '@/config/brand'
import type { Course, CourseSettings, Place } from '@/domain/models'
import { categoryNames, emptyFilters } from '@/domain/models'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { Brand, CategoryIcon } from '@/components/Brand'
import { FilterPanel } from '@/components/Filters'
import { api, isDemo } from '@/services/api'
import {
  dateKey,
  makeDemoCourse,
  priceText,
  recalculate,
} from '@/domain/planning'
import { shareUrl } from '@/services/sharing'
import { safeUrl } from '@/domain/validation'

export function Onboarding({ splash = false }: { splash?: boolean }) {
  const { preview } = useApp()
  useEffect(() => {
    if (!splash || preview) return
    const timer = window.setTimeout(() => go('/onboarding'), 1200)
    return () => window.clearTimeout(timer)
  }, [splash, preview])
  return (
    <section className={`onboarding-screen ${splash ? 'splash' : ''}`}>
      <Brand large />
      {!splash && (
        <>
          <h1>{SERVICE_NAME}</h1>
          <button
            className="onboarding-enter"
            type="button"
            onClick={() => go('/login')}
          >
            시작하기 →
          </button>
        </>
      )}
    </section>
  )
}
export function SearchConditions() {
  const { filters, setFilters } = useApp()
  const [editing, setEditing] = useState(false)
  const summaries = [
    [
      '언제',
      filters.date
        ? `${filters.date}${filters.until ? ` ~ ${filters.until}` : ''}`
        : '날짜 상관없음',
    ],
    ['누구와', filters.companions.join(' · ') || '동행 상관없음'],
    ['지역', filters.districts.join(' · ') || '용인 전체'],
    [
      '취향',
      [
        ...filters.categories.map((c) => categoryNames[c]),
        ...(filters.freeOnly ? ['무료'] : []),
        ...(filters.environment
          ? [filters.environment === 'outdoor' ? '야외' : '실내']
          : []),
      ].join(' · ') || '모든 취향',
    ],
  ]
  return (
    <>
      <h1 className="blue">원하는 하루를 골라요</h1>
      {summaries.map(([label, value]) => (
        <div className="condition-row" key={label}>
          <span>{label}</span>
          <button
            type="button"
            className="secondary"
            onClick={() => setEditing(!editing)}
          >
            ✓ {value}
          </button>
        </div>
      ))}
      {editing && <FilterPanel />}
      <button type="button" className="primary" onClick={() => go('/events')}>
        이 조건으로 행사 보기 →
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setFilters(emptyFilters)
          go('/events')
        }}
      >
        조건 초기화 · 전체 행사 보기
      </button>
    </>
  )
}
export function Generating({ eventId }: { eventId: string }) {
  const app = useApp()
  const latest = useRef(app)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    latest.current = app
  }, [app])
  const jobId = app.generation?.id
  useEffect(() => {
    const state = latest.current
    const job = state.generation
    if (!job || state.preview?.id === '205:45') return
    const controller = new AbortController()
    let live = true
    const run = async () => {
      try {
        const event = state.data?.events.find((e) => e.id === job.eventId)
        if (!event || !state.data)
          throw new Error('선택한 행사 정보를 다시 확인해 주세요.')
        const resolved: CourseSettings =
          !isDemo && !job.settings.originLocation
            ? {
                ...job.settings,
                originLocation: await api.geocode(
                  job.settings.origin,
                  controller.signal,
                ),
              }
            : job.settings
        if (isDemo)
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(resolve, 700)
            controller.signal.addEventListener(
              'abort',
              () => {
                window.clearTimeout(timer)
                reject(new DOMException('Aborted', 'AbortError'))
              },
              { once: true },
            )
          })
        const result = isDemo
          ? makeDemoCourse(event, state.data, resolved)
          : await api.generateCourse(event.id, resolved, controller.signal)
        if (live) {
          state.storeDraft(result)
          state.setGeneration(null)
          go(`/course/${result.id}`)
        }
      } catch (e) {
        if (live && !controller.signal.aborted)
          setError(e instanceof Error ? e.message : '일정을 만들지 못했어요.')
      }
    }
    void run()
    return () => {
      live = false
      controller.abort()
    }
  }, [jobId, retry])
  if (!app.generation)
    return (
      <>
        <h1>코스 조건을 먼저 골라 주세요</h1>
        <a
          className="primary"
          href={`#/configure/${encodeURIComponent(eventId)}`}
        >
          코스 설정으로
        </a>
      </>
    )
  return (
    <section className="generation-screen">
      <p className="eyebrow">CONNECTING YOUR DAY</p>
      <h1>
        {error ? (
          '하루를 연결하지 못했어요'
        ) : (
          <>
            선택한 곳 주변의
            <br />
            하루를 연결하고 있어요…
          </>
        )}
      </h1>
      {error ? (
        <>
          <p className="error small" role="alert">
            {error}
          </p>
          <button
            className="primary"
            type="button"
            onClick={() => {
              setError('')
              setRetry(retry + 1)
            }}
          >
            다시 시도
          </button>
        </>
      ) : (
        <div
          className="generation-icons"
          role="status"
          aria-label="일정 생성 중"
        >
          {(
            ['park', 'food', 'cafe', 'culture', 'sports', 'shopping'] as const
          ).map((c) => (
            <CategoryIcon key={c} category={c} size={40} />
          ))}
        </div>
      )}
      <button
        className="text-button small"
        type="button"
        onClick={() => go(`/configure/${encodeURIComponent(eventId)}`)}
      >
        {error ? '조건 바꾸기' : '취소하고 조건으로 돌아가기'}
      </button>
    </section>
  )
}
export function Origin({ eventId }: { eventId: string }) {
  const app = useApp()
  const base =
    app.setup?.eventId === eventId ? app.setup.settings : app.draft?.settings
  const [origin, setOrigin] = useState(base?.origin ?? '')
  const [coordinate, setCoordinate] = useState(base?.originLocation ?? null)
  const [error, setError] = useState('')
  return (
    <>
      <h1 className="blue">어디에서 출발하나요?</h1>
      <p className="small muted">
        위치를 사용할 수 없을 때는
        <br />
        출발지를 직접 선택할 수 있어요.
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!base) {
            setError('코스 설정에서 방문 조건을 먼저 입력해 주세요.')
            return
          }
          app.setSetup({
            eventId,
            settings: {
              ...base,
              origin: origin.trim(),
              originLocation: coordinate,
            },
          })
          go(`/configure/${eventId}`)
        }}
      >
        <label className="panel origin-field">
          <input
            aria-label="출발지 주소"
            required
            value={origin}
            maxLength={200}
            placeholder="기흥역 또는 출발지 주소"
            onChange={(e) => {
              setOrigin(e.target.value)
              setCoordinate(null)
            }}
          />
          <span className="tiny muted">
            선택한 출발지{isDemo ? ' · 시연용 입력' : ''}
          </span>
        </label>
        <button
          type="button"
          className="secondary"
          disabled={app.locating}
          onClick={() =>
            void app
              .locate()
              .then((p) => {
                setCoordinate(p)
                setOrigin('현재 위치')
              })
              .catch((e) => setError(e.message))
          }
        >
          ⌖ 내 위치 사용
        </button>
        {error && (
          <p className="error small" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          이 출발지로 설정 →
        </button>
      </form>
    </>
  )
}
export function CourseSummary({ course }: { course: Course }) {
  return (
    <section className="panel course-summary">
      <div className="row">
        <CategoryIcon category="park" size={28} />
        <h2>{course.name}</h2>
      </div>
      <p className="small muted">
        {course.settings.date} · {course.settings.companion} ·{' '}
        {course.stops.filter((s) => s.place).length}개 일정
      </p>
      {course.stops.find((s) => s.kind === 'meal')?.place && (
        <p className="row blue small">
          <CategoryIcon category="food" size={20} />
          {course.stops.find((s) => s.kind === 'meal')?.title}
        </p>
      )}
    </section>
  )
}
async function updateCourse(
  course: Course,
  next: Course,
  store: (c: Course) => void,
) {
  const result = isDemo ? recalculate(next) : await api.recalculateCourse(next)
  store(result)
  go(`/course/${course.id}`)
}
export function ReplacePlace({
  course,
  stopId,
}: {
  course: Course
  stopId: string
}) {
  const app = useApp()
  const stop = course.stops.find((s) => s.id === stopId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const event = app.data?.events.find((e) => e.id === course.eventId)
  const pool: Place[] =
    stop?.kind === 'program'
      ? (event?.programs.map((p) => ({
          ...event,
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          durationMinutes: p.durationMinutes,
        })) ?? [])
      : [
          ...(app.data?.places ?? []),
          ...(app.data?.events.filter(
            (e) =>
              dateKey(new Date(e.startsAt)) <= course.settings.date &&
              dateKey(new Date(e.endsAt)) >= course.settings.date,
          ) ?? []),
        ]
  const candidates = pool
    .filter(
      (p) =>
        (stop?.kind === 'meal'
          ? p.category === 'food'
          : !stop?.place || p.category === stop.place.category) &&
        (course.settings.budget !== 0 || p.price === 0) &&
        !course.stops.some((s) => s.place?.id === p.id),
    )
    .slice(0, 3)
  const choose = async (place: Place) => {
    setBusy(true)
    setError('')
    try {
      await updateCourse(
        course,
        {
          ...course,
          stops: course.stops.map((s) =>
            s.id === stopId
              ? {
                  ...s,
                  title: place.name,
                  place,
                  durationMinutes: place.durationMinutes,
                  missingReason: null,
                }
              : s,
          ),
        },
        (c) => {
          app.storeDraft(c)
          if (app.courses.some((saved) => saved.id === c.id)) app.saveCourse(c)
        },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '장소를 바꾸지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <h1 className="blue">
        다른 {stop?.kind === 'meal' ? '맛집' : '장소'}으로 바꿔볼까요?
      </h1>
      <p className="small muted">
        {event?.name} 주변의 {isDemo ? '시연용 ' : ''}후보예요.
        <br />
        장소를 누르면 일정에 바로 반영됩니다.
      </p>
      {candidates.map((p) => (
        <button
          className="candidate"
          type="button"
          disabled={busy}
          key={p.id}
          onClick={() => void choose(p)}
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
      ))}
      {!candidates.length && (
        <p className="info">
          같은 조건의 다른 후보가 없어요. 직접 입력하거나 조건을 바꿔 주세요.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <a
        className="secondary"
        href={`#/manual/${course.id}?stop=${encodeURIComponent(stopId)}`}
      >
        장소 직접 입력 →
      </a>
      <a className="text-button small" href={`#/course/${course.id}`}>
        취소하고 일정으로 돌아가기
      </a>
    </>
  )
}
export function ManualEntry({
  course,
  stopId,
}: {
  course: Course
  stopId: string
}) {
  const app = useApp()
  const stop = course.stops.find((s) => s.id === stopId)
  const [name, setName] = useState(
    app.preview?.id === '205:131'
      ? '호수공원에서 도시락'
      : (stop?.place?.name ?? ''),
  )
  const [duration, setDuration] = useState(stop?.durationMinutes || 45)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <>
      <h1 className="blue">
        {stop?.kind === 'meal' ? '식사도' : '일정도'} 내 취향대로
      </h1>
      <form
        className="manual-form"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          const place: Place = {
            id: crypto.randomUUID(),
            name: name.trim(),
            description: '사용자가 직접 입력한 계획',
            category:
              stop?.kind === 'meal'
                ? 'food'
                : (stop?.place?.category ?? 'culture'),
            district: '',
            address: '',
            location: null,
            imageUrl: null,
            price: null,
            durationMinutes: duration,
            openingHours: '',
            source: {
              name: '직접 입력',
              url: null,
              updatedAt: new Date().toISOString(),
              isDemo: false,
            },
          }
          void updateCourse(
            course,
            {
              ...course,
              stops: course.stops.map((s) =>
                s.id === stopId
                  ? {
                      ...s,
                      title: place.name,
                      place,
                      durationMinutes: duration,
                      missingReason: null,
                    }
                  : s,
              ),
            },
            (c) => {
              app.storeDraft(c)
              if (app.courses.some((saved) => saved.id === c.id))
                app.saveCourse(c)
            },
          )
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false))
        }}
      >
        <label className="field">
          <span className="row">
            <CategoryIcon category="food" size={20} />
            {stop?.kind === 'meal' ? '식사 장소 또는 계획' : '장소 또는 계획'}
          </span>
          <input
            aria-label="장소 이름"
            required
            maxLength={100}
            value={name}
            placeholder="호수공원에서 도시락"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <section className="panel stack">
          <label className="row small blue">
            머무는 시간
            <input
              className="duration-input"
              aria-label="머무는 시간 (분)"
              required
              type="number"
              min="1"
              max="720"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
            분
          </label>
          <p className="small muted">
            직접 입력한 계획의 비용은 미확인으로 표시하며, 예상 비용 합계에서
            제외해요.
          </p>
        </section>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '반영 중…' : '코스에 반영 →'}
        </button>
        <a className="secondary" href={`#/course/${course.id}`}>
          취소하고 일정으로 돌아가기
        </a>
      </form>
    </>
  )
}
export function SaveShare({ course }: { course: Course }) {
  const app = useApp()
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const create = async () => {
    try {
      const url = shareUrl(course)
      setLink(url)
      try {
        await navigator.clipboard?.writeText(url)
        app.setToast('공유 링크를 복사했어요.')
      } catch {
        setError(
          '자동 복사가 허용되지 않았어요. 아래 링크를 직접 복사해 주세요.',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '공유 링크를 만들지 못했어요.')
    }
  }
  return (
    <>
      <p className="eyebrow normal-weight">A DAY WORTH SHARING</p>
      <h1 className="blue">이 하루를 함께 나눠요</h1>
      <CourseSummary course={course} />
      <button
        type="button"
        className="primary"
        onClick={() => {
          if (app.saveCourse(course)) setSaved(true)
        }}
      >
        내 코스에 저장
      </button>
      {saved && (
        <p className="info small" role="status">
          이 브라우저에 저장했어요.{' '}
          <a href="#/saved-courses" className="source-link">
            저장한 코스 열기 →
          </a>
        </p>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => {
          try {
            go(
              '/shared?data=' +
                encodeURIComponent(shareUrl(course).split('?data=')[1]),
            )
          } catch (e) {
            setError((e as Error).message)
          }
        }}
      >
        공유 일정 미리보기 ↗
      </button>
      <button type="button" className="secondary" onClick={() => void create()}>
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
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
      <p className="tiny muted">
        출발지·현재 위치·아이 나이는 공유하지 않아요. 링크에는 공유 시점의
        일정이 담겨요.
      </p>
    </>
  )
}
export function DeleteCourse({ course }: { course: Course }) {
  const app = useApp()
  return (
    <div className="delete-course-screen">
      <h1 className="blue">저장한 코스를 삭제할까요?</h1>
      <p className="small muted">
        내 코스 목록에서 이 하루가 사라져요.
        <br />
        필요하다면 삭제 전에 일정을 다시 확인해 주세요.
      </p>
      <CourseSummary course={course} />
      <a className="primary" href="#/saved-courses">
        코스 유지하기
      </a>
      <button
        className="secondary danger"
        type="button"
        onClick={() => {
          const ok = app.setCourses(
            app.courses.filter((c) => c.id !== course.id),
          )
          if (ok) {
            app.setToast('코스를 삭제했어요.')
            go('/saved')
          }
        }}
      >
        삭제하기
      </button>
    </div>
  )
}
export function Help() {
  const app = useApp()
  const eventId = app.draft?.eventId ?? app.data?.events[0]?.id
  return (
    <>
      <p className="guide-description help-intro">
        상황에 맞는 안내를 보고, 필요한 화면으로 이동하세요.
      </p>
      {[
        [
          '검색 결과가 없을 때',
          '조건을 줄이거나 초기화해서 다시 찾아보세요.',
          '검색 조건 다시 고르기 →',
          '/conditions',
        ],
        [
          '위치를 사용할 수 없을 때',
          '위치 권한 대신 출발지를 직접 선택할 수 있어요.',
          '출발지 설정하기 →',
          `/origin/${eventId ?? ''}`,
        ],
        [
          '설정한 시간을 넘을 때',
          '일정을 자르지 않고 안내해요. 종료 시간을 늘리거나 일정을 조정해 주세요.',
          '코스 조건 바꾸기 →',
          `/configure/${eventId ?? ''}`,
        ],
        [
          '코스를 저장·공유할 때',
          '저장한 상태를 다시 열 수 있어요. 공유는 일정 미리보기로 확인합니다.',
          '저장·공유 화면 보기 →',
          app.draft ? `/share/${app.draft.id}` : '/saved',
        ],
      ].map(([title, body, label, path]) => (
        <section className="panel stack" key={title}>
          <h2 className="h3">{title}</h2>
          <p className="small muted">{body}</p>
          <a className="small blue strong" href={`#${path}`}>
            {label}
          </a>
        </section>
      ))}
    </>
  )
}
export function LogoutComplete() {
  return (
    <section className="panel completion-card">
      <p className="eyebrow">로그아웃 완료</p>
      <h1>다시 만나요!</h1>
      <p className="small muted">
        안전하게 로그아웃했어요.
        <br />내 코스를 보려면 다시 로그인해 주세요.
      </p>
      <a className="primary" href="#/login">
        로그인하기
      </a>
      <a className="secondary tinted" href="#/">
        로그인 없이 둘러보기
      </a>
    </section>
  )
}
export function ContactComplete() {
  const app = useApp()
  if (!app.contactReceipt)
    return (
      <section className="panel stack">
        <h1>문의 접수 내역이 없어요</h1>
        <a className="primary" href="#/contact">
          문의 작성하기
        </a>
      </section>
    )
  return (
    <section className="panel completion-card">
      <p className="eyebrow">접수 완료</p>
      <h1>문의를 잘 받았어요</h1>
      <p className="small muted">
        보내주신 내용을 확인한 뒤<br />
        아래 이메일로 답변드릴게요.
      </p>
      <div className="receipt-email">
        <span className="tiny muted">답변받을 이메일</span>
        <strong>{app.contactReceipt?.email ?? '이메일 정보 없음'}</strong>
      </div>
      {app.contactReceipt?.isDemo && (
        <p className="tiny muted">
          시연용 완료 화면입니다. 실제 문의는 전송되지 않았어요.
        </p>
      )}
      <a className="primary" href="#/settings">
        설정으로 돌아가기
      </a>
    </section>
  )
}
export function Differences({ eventId }: { eventId: string }) {
  const app = useApp()
  const event = app.data?.events.find((e) => e.id === eventId)
  const conflicts =
    app.preview?.id === '205:346'
      ? [
          {
            field: '요금',
            entries: [
              { sourceName: '공식 행사 안내', value: '입장 무료', url: null },
              {
                sourceName: '운영 블로그',
                value: '일부 체험 5,000원',
                url: null,
              },
            ],
          },
        ]
      : (event?.conflicts ?? [])
  return (
    <>
      <h1 className="blue">출처마다 안내가 달라요</h1>
      <p className="small muted">항목별 안내를 구분해서 확인해 주세요.</p>
      {conflicts.flatMap((conflict, i) =>
        conflict.entries.map((entry, j) => (
          <section className="panel difference-card" key={`${i}-${j}`}>
            <p className="tiny muted">
              {entry.sourceName}
              {event?.source.isDemo ? ' · 시연' : ''}
            </p>
            <h2 className="blue">{entry.value}</h2>
            {safeUrl(entry.url) && (
              <a
                className="small blue"
                href={safeUrl(entry.url)}
                rel="noopener noreferrer"
                target="_blank"
              >
                원문 확인 ↗
              </a>
            )}
          </section>
        )),
      )}
      {!conflicts.length && <p className="info">확인된 출처 차이가 없어요.</p>}
      <a className="primary" href={`#/events/${eventId}`}>
        확인했어요
      </a>
    </>
  )
}
