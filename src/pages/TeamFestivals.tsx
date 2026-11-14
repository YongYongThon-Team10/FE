import { useEffect, useRef, useState } from 'react'
import { teamBackend } from '@/services/teamBackend'
import type {
  EventDetail,
  EventList,
  Itinerary,
  OriginPlace,
  SharedItinerary,
} from '@/services/teamBackend/contracts'
import { PlacePhoto } from '@/components/PlacePhoto'
import { dateKey } from '@/domain/planning'
import { safeUrl } from '@/domain/validation'
import { go } from '@/hooks/useRoute'
import { useResource } from '@/hooks/useResource'
import { useStorage } from '@/hooks/useStorage'
import { useApp } from '@/state/context'
import { localFestivalCourse } from '@/services/teamBackend/localCourse'

function Status({ error, retry }: { error?: string; retry: () => void }) {
  return error ? (
    <div role="alert" className="error">
      {error}
      <p>
        행사 정보를 불러오지 못해도{' '}
        <a href="#/places?q=용인%20관광명소">실제 장소로 하루 코스 만들기</a>는
        계속 이용할 수 있어요.
      </p>
      <button className="text-button" onClick={retry}>
        다시 불러오기
      </button>
    </div>
  ) : (
    <p role="status">행사 정보를 불러오고 있어요.</p>
  )
}
function validList(value: EventList) {
  if (
    !value ||
    !Array.isArray(value.events) ||
    !Number.isInteger(value.totalCount) ||
    !value.events.every(
      (e) =>
        typeof e.eventId === 'string' &&
        typeof e.name === 'string' &&
        Array.isArray(e.tags),
    )
  )
    throw new Error('행사 목록 응답을 확인해 주세요.')
  return value
}
function validDetail(value: EventDetail) {
  if (
    !value ||
    typeof value.name !== 'string' ||
    typeof value.eventId !== 'string' ||
    !value.keyInfo ||
    !value.apply ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.programs)
  )
    throw new Error('행사 상세 응답을 확인해 주세요.')
  return value
}
export function TeamFestivals({ id = '' }: { id?: string }) {
  if (!teamBackend.enabled)
    return <p className="info">행사 서버 연결을 준비 중이에요.</p>
  return id ? <FestivalDetail key={id} id={id} /> : <FestivalList />
}
function FestivalList() {
  const [{ from, until, district, page }, setList, storageError] = useStorage(
    'yongin.festival-list.v1',
    { from: dateKey(), until: dateKey(), district: '', page: 0 },
    (value: unknown) => {
      const v = value as {
        from: string
        until: string
        district: string
        page: number
      }
      if (
        !v ||
        ![v.from, v.until].every(
          (d) =>
            typeof d === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(d) &&
            Number.isFinite(Date.parse(d)),
        ) ||
        v.from > v.until ||
        !['', '기흥구', '수지구', '처인구'].includes(v.district) ||
        !Number.isInteger(v.page) ||
        v.page < 0
      )
        throw new Error('조회 조건을 확인해 주세요.')
      return v
    },
  )
  const change = (
    patch: Partial<{
      from: string
      until: string
      district: string
      page: number
    }>,
  ) => setList({ from, until, district, page, ...patch })
  const { data, error, retry } = useResource<EventList>(
    (signal) =>
      teamBackend
        .events(
          {
            dateFrom: from,
            dateTo: until,
            district: district ? [district] : undefined,
            page,
            size: 12,
          },
          signal,
        )
        .then(validList),
    JSON.stringify([from, until, district, page]),
  )
  return (
    <div className="stack">
      <h1>용인 축제와 행사</h1>
      <p className="small muted">
        공식 행사 데이터로 조회합니다. 연간 계획이나 예정 일정은 방문 전
        출처에서 확인해 주세요.
      </p>
      <div className="panel form-stack">
        <label className="field">
          시작 날짜
          <input
            type="date"
            value={from}
            onChange={(e) => {
              if (e.target.value) {
                change({
                  from: e.target.value,
                  until: until < e.target.value ? e.target.value : until,
                  page: 0,
                })
              }
            }}
          />
        </label>
        <label className="field">
          종료 날짜
          <input
            type="date"
            min={from}
            value={until}
            onChange={(e) => {
              if (e.target.value >= from) {
                change({ until: e.target.value, page: 0 })
              }
            }}
          />
        </label>
        <label className="field">
          지역
          <select
            value={district}
            onChange={(e) => {
              change({ district: e.target.value, page: 0 })
            }}
          >
            <option value="">용인 전체</option>
            {['기흥구', '수지구', '처인구'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      {storageError && (
        <p role="alert" className="error">
          {storageError}
        </p>
      )}
      {!data ? (
        <Status error={error} retry={retry} />
      ) : (
        <>
          <p role="status">조회된 행사 {data.totalCount}개</p>
          {!data.events.length && (
            <div className="empty-state">
              <h2>조회된 행사가 없어요</h2>
              <p>날짜와 지역을 바꾸어 확인해 주세요.</p>
              <button className="secondary" onClick={retry}>
                다시 불러오기
              </button>
            </div>
          )}
          {data.events.map((e) => (
            <article className="panel stack" key={e.eventId}>
              <PlacePhoto name={e.name} image={e} />
              <p className="tiny muted">
                {e.subCategory || e.category} / {e.dateStatus}
              </p>
              <h2>
                <a href={`#/festivals/${encodeURIComponent(e.eventId)}`}>
                  {e.name}
                </a>
              </h2>
              <p>
                {e.startDate ?? '날짜 미확인'} ~ {e.endDate ?? '날짜 미확인'}
              </p>
              <p className="small">
                {e.placeName ?? e.address ?? '장소 정보 없음'}
              </p>
              <p className="small">
                {e.fee ?? (e.isFree === true ? '무료' : '요금 정보 없음')}
              </p>
              <a
                className="primary"
                href={`#/festivals/${encodeURIComponent(e.eventId)}`}
              >
                행사 자세히 보기
              </a>
            </article>
          ))}
          <div className="row between">
            <button
              className="secondary"
              disabled={page === 0}
              onClick={() => change({ page: page - 1 })}
            >
              이전
            </button>
            <span>{page + 1}페이지</span>
            <button
              className="secondary"
              disabled={(page + 1) * 12 >= data.totalCount}
              onClick={() => change({ page: page + 1 })}
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  )
}
function FestivalDetail({ id }: { id: string }) {
  const {
    data: e,
    error,
    retry,
  } = useResource(
    (signal) => teamBackend.event(id, signal).then(validDetail),
    id,
  )
  if (!e) return <Status error={error} retry={retry} />
  const info = e.keyInfo
  const returnTo = new URLSearchParams(window.location.hash.split('?')[1]).get(
    'return',
  )
  return (
    <div className="stack">
      {returnTo?.startsWith('/search?q=') && (
        <a className="small blue" href={`#${returnTo}`}>
          검색 결과로
        </a>
      )}
      <a className="small blue" href="#/festivals">
        행사 목록
      </a>
      <PlacePhoto name={e.name} image={e} placeholder />
      <h1>{e.name}</h1>
      <p>
        {e.subCategory || e.category} / {info.dateStatus}
      </p>
      <p>
        {info.startDate ?? '날짜 미확인'} ~ {info.endDate ?? '날짜 미확인'}
      </p>
      <section className="panel stack">
        <h2>행사 안내</h2>
        <p>{info.time ?? '운영 시간 정보 없음'}</p>
        <p>{info.placeName ?? '장소 정보 없음'}</p>
        <p>{info.address ?? '주소 정보 없음'}</p>
        <p>{info.fee ?? (info.isFree === true ? '무료' : '요금 정보 없음')}</p>
        {e.notice && <p>{e.notice}</p>}
        {info.lat !== null &&
          info.lng !== null &&
          Number.isFinite(info.lat) &&
          Number.isFinite(info.lng) && (
            <a
              className="secondary"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://map.kakao.com/link/map/${encodeURIComponent(info.placeName || e.name)},${info.lat},${info.lng}`}
            >
              카카오맵에서 위치 확인
            </a>
          )}
        {safeUrl(e.apply.url) && (
          <a
            className="primary"
            target="_blank"
            rel="noopener noreferrer"
            href={safeUrl(e.apply.url)}
          >
            공식 신청 안내
          </a>
        )}
      </section>
      <section className="panel stack">
        <h2>공식 출처</h2>
        {e.sources.map((s, i) =>
          safeUrl(s.url) ? (
            <a
              key={i}
              href={safeUrl(s.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.name}
            </a>
          ) : (
            <p key={i}>{s.name}</p>
          ),
        )}
      </section>
      <FestivalGenerator event={e} />
    </div>
  )
}
function FestivalGenerator({ event }: { event: EventDetail }) {
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<OriginPlace[]>([])
  const [origin, setOrigin] = useState<OriginPlace>()
  const [date, setDate] = useState(dateKey())
  const [transport, setTransport] = useState<'walk' | 'car' | 'transit'>(
    'transit',
  )
  const [start, setStart] = useState('10:00'),
    [end, setEnd] = useState('18:00')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const search = async () => {
    const controller = new AbortController()
    pending.current?.abort()
    pending.current = controller
    setBusy(true)
    setError('')
    try {
      const result = await teamBackend.originPlaces(query, controller.signal)
      if (controller.signal.aborted) return
      if (!Array.isArray(result?.places))
        throw new Error('출발지 응답을 확인해 주세요.')
      setPlaces(result.places)
      setOrigin(undefined)
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : '출발지를 찾지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  const generate = async () => {
    if (!origin || !date || start >= end) {
      setError('출발지를 선택하고 날짜와 시간대를 확인해 주세요.')
      return
    }
    setBusy(true)
    setError('')
    const controller = new AbortController()
    pending.current?.abort()
    pending.current = controller
    try {
      const value = await teamBackend.createItinerary(
        {
          baseEventId: event.eventId,
          date,
          origin: { type: 'manual', ...origin },
          transport,
          timeWindow: { start, end },
          budget: 'any',
          wants: [],
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      if (typeof value?.itineraryId !== 'string')
        throw new Error('일정 응답을 확인해 주세요.')
      go(`/festival-itinerary/${encodeURIComponent(value.itineraryId)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '일정을 만들지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel form-stack">
      <h2>이 행사로 하루 일정 만들기</h2>
      <label className="field">
        출발지
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOrigin(undefined)
            setPlaces([])
          }}
          maxLength={100}
        />
      </label>
      <button
        className="secondary"
        disabled={busy || !query.trim()}
        onClick={() => void search()}
      >
        출발지 검색
      </button>
      {places.map((p, i) => (
        <button
          className="secondary"
          aria-pressed={origin === p}
          key={i}
          onClick={() => setOrigin(p)}
        >
          {p.name} / {p.address}
          {origin === p ? ' (선택됨)' : ''}
        </button>
      ))}
      <label className="field">
        방문 날짜
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="field">
        시작 시간
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label className="field">
        종료 시간
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <label className="field">
        이동수단
        <select
          value={transport}
          onChange={(e) => setTransport(e.target.value as typeof transport)}
        >
          <option value="transit">대중교통</option>
          <option value="car">자가용</option>
          <option value="walk">도보</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        className="primary"
        disabled={busy || !origin}
        onClick={() => void generate()}
      >
        {busy ? '처리 중…' : '행사 일정 생성'}
      </button>
      <p className="tiny muted">
        행사 서버가 계산하는 일정입니다. 실제 음식점과 카페는 장소 찾기에서
        확인할 수 있어요.
      </p>
    </section>
  )
}
export function FestivalItinerary({ id }: { id: string }) {
  const app = useApp()
  const [importError, setImportError] = useState('')
  const [shareId, setShareId] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const share = async () => {
    setSharing(true)
    setShareError('')
    try {
      const result = await teamBackend.share(id)
      if (
        typeof result?.shareId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(result.shareId)
      )
        throw new Error('공유 응답을 확인해 주세요.')
      // The BE currently returns an example.com placeholder in shareUrl.
      // Route the server share ID through our own public, read-only screen.
      setShareId(result.shareId)
    } catch (e) {
      setShareError(
        e instanceof Error ? e.message : '공유 링크를 만들지 못했어요.',
      )
    } finally {
      setSharing(false)
    }
  }
  const { data, error, retry } = useResource<Itinerary>(
    (signal) =>
      teamBackend.itinerary(id, signal).then((v) => {
        if (!v || !Array.isArray(v.slots) || !Array.isArray(v.warnings))
          throw new Error('일정 응답을 확인해 주세요.')
        return v
      }),
    id,
  )
  if (!data) return <Status error={error} retry={retry} />
  return (
    <div className="stack">
      <h1>{data.title ?? '행사 하루 일정'}</h1>
      <p>{data.date}</p>
      <p className="small muted">
        이동시간은 직선거리 기반 추정입니다. 서버 일정은 현재 공용 데모 방식이며
        개인 보관함과 다릅니다.
      </p>
      <section className="panel stack">
        <h2>내 코스로 편집하고 보관하기</h2>
        <p className="small muted">
          이 브라우저에 편집본을 만들어 장소·시간·순서를 바꾸고 지도에서 확인할
          수 있어요. 서버의 공용 일정은 변경하지 않아요.
        </p>
        <button
          className="primary"
          onClick={() => {
            try {
              const course = localFestivalCourse(data)
              app.storeDraft(course)
              if (app.saveCourse(course)) go(`/course/${course.id}`)
              else
                setImportError(
                  '편집본은 만들었지만 브라우저 저장에 실패했어요. 저장 공간을 확인해 주세요.',
                )
            } catch (e) {
              setImportError(
                e instanceof Error ? e.message : '편집본을 만들지 못했어요.',
              )
            }
          }}
        >
          이 브라우저에 저장하고 편집
        </button>
        {importError && (
          <p className="error" role="alert">
            {importError}
          </p>
        )}
      </section>
      {data.warnings.map((w, i) => (
        <p className="info small" key={i}>
          {w.message}
        </p>
      ))}
      {data.slots.map((s) => (
        <article className="panel stack" key={s.slotId}>
          <h2>{s.title ?? '장소 미정'}</h2>
          <p>
            {s.startTime ?? '시간 미정'} ~ {s.endTime ?? '시간 미정'}
          </p>
          <p>{s.place?.name ?? '장소 미정'}</p>
          <p>{s.costText ?? '요금 정보 없음'}</p>
          {safeUrl(s.moveFromPrev?.mapLink) && (
            <a
              href={safeUrl(s.moveFromPrev?.mapLink)}
              target="_blank"
              rel="noopener noreferrer"
            >
              카카오맵 길찾기
            </a>
          )}
        </article>
      ))}
      <section className="panel stack">
        <h2>함께 볼 일정 공유하기</h2>
        <p className="small muted">
          링크를 아는 사람은 일정의 장소와 시간을 볼 수 있어요. 귀가 장소 등
          공개할 정보를 확인한 뒤 공유해 주세요.
        </p>
        {!shareId && (
          <button
            className="secondary"
            disabled={sharing}
            onClick={() => void share()}
          >
            {sharing ? '공유 링크 만드는 중…' : '행사 일정 공유 링크 만들기'}
          </button>
        )}
        {shareId && (
          <>
            <label className="field">
              공유 주소
              <input
                readOnly
                value={`${window.location.origin}${window.location.pathname}#/festival-shared/${encodeURIComponent(shareId)}`}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <a
              className="secondary"
              href={`#/festival-shared/${encodeURIComponent(shareId)}`}
            >
              공유 일정 열기
            </a>
          </>
        )}
        {shareError && (
          <p className="error" role="alert">
            {shareError}
          </p>
        )}
      </section>
      <a href="#/festivals" className="secondary">
        행사 목록으로
      </a>
    </div>
  )
}

export function FestivalShared({ id }: { id: string }) {
  const { data, error, retry } = useResource<SharedItinerary>(
    (signal) =>
      teamBackend.shared(id, signal).then((value) => {
        const text = (field: unknown) =>
          field == null || typeof field === 'string'
        if (
          !value ||
          value.shareId !== id ||
          typeof value.date !== 'string' ||
          !text(value.title) ||
          !Array.isArray(value.slots) ||
          !value.slots.every(
            (s) =>
              s &&
              Number.isInteger(s.order) &&
              typeof s.type === 'string' &&
              [
                s.title,
                s.startTime,
                s.endTime,
                s.costText,
                s.place?.name,
              ].every(text),
          )
        )
          throw new Error('공유 일정 응답을 확인해 주세요.')
        return value
      }),
    id,
  )
  if (!data) return <Status error={error} retry={retry} />
  return (
    <div className="stack">
      <h1>{data.title ?? '함께하는 행사 일정'}</h1>
      <p>{data.date}</p>
      <p className="small muted">
        공유된 일정입니다. 제안된 시간과 실제 운영 시간은 다를 수 있으니 방문 전
        공식 출처에서 확인해 주세요.
      </p>
      <PlacePhoto
        name={data.title ?? '행사 일정'}
        image={{ imageUrl: data.coverImageUrl }}
      />
      {[...data.slots]
        .sort((a, b) => a.order - b.order)
        .map((s, index) => (
          <article className="panel stack" key={`${s.order}-${index}`}>
            <h2>{s.title ?? '장소 미정'}</h2>
            <p>
              {s.startTime ?? '시간 미정'} ~ {s.endTime ?? '시간 미정'}
            </p>
            <p>{s.place?.name ?? '장소 미정'}</p>
            <p>{s.costText ?? '요금 정보 없음'}</p>
          </article>
        ))}
      <a className="secondary" href="#/festivals">
        나도 행사 찾아보기
      </a>
    </div>
  )
}
