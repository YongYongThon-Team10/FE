import { lazy, Suspense, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Facility, FacilityCatalog } from '@/domain/facilities'
import { occupancyStatus } from '@/domain/facilities'
import { useFacilities } from '@/hooks/useFacilities'
import { go } from '@/hooks/useRoute'
import { Modal } from '@/components/Modal'
import { safeUrl } from '@/domain/validation'
const PlaceMap = lazy(() => import('@/components/PlaceMap'))
const groups = ['운동·체육', '문화·예술', '공원·야외', '생활편의']
const types: Record<string, string[]> = {
  '운동·체육': ['수영장', '체육관'],
  '문화·예술': ['전시시설', '도서관'],
  '공원·야외': ['공원'],
  생활편의: ['마트'],
}
const towns = [
  '구갈동',
  '신갈동',
  '구성동',
  '보정동',
  '하갈동',
  '영덕동',
  '상갈동',
]
const time = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '없음'
const statusClass = (f: Facility) =>
  ({ 여유: 'free', 보통: 'moderate', 혼잡: 'busy', '정보 없음': 'unknown' })[
    occupancyStatus(f)
  ]
function Status({ facility }: { facility: Facility }) {
  return (
    <span className={`facility-status ${statusClass(facility)}`}>
      {occupancyStatus(facility)}
    </span>
  )
}
function FacilityCard({ facility: f }: { facility: Facility }) {
  return (
    <a className="facility-card" href={`#/facilities/detail/${f.id}`}>
      <div className="row between">
        <span className="tiny muted">
          {f.group} / {f.type}
        </span>
        <Status facility={f} />
      </div>
      <h2>
        {f.name}
        <span>›</span>
      </h2>
      <p className="tiny muted">{f.address}</p>
      <p className="small">
        {f.openingHours || '운영시간 정보 없음'}
        {f.holiday ? ` · ${f.holiday}` : ''}
      </p>
      <div className="facility-card-meta">
        <strong>
          {f.occupancy
            ? `이용 ${f.occupancy.current}명 / ${f.source.isDemo ? '가상 ' : ''}정원 ${f.occupancy.capacity}명`
            : '이용 현황 미제공'}
        </strong>
        <p>
          {f.parking
            ? `${f.parking.name} · ${f.parking.available === null ? '현황 미제공' : `잔여 ${f.parking.available} / 전체 ${f.parking.total ?? '미확인'}면`}`
            : '연결된 주차장 정보 없음'}
        </p>
        <p>
          {f.occupancy
            ? `시연 기준 ${time(f.occupancy.observedAt)}`
            : '기준 시각 없음'}
          {f.source.isDemo ? ' · 가상 시설' : ''}
        </p>
        {f.eventIds.length > 0 && (
          <span className="facility-green">
            연결 행사 · {f.eventIds.length}개 행사 보기 ›
          </span>
        )}
      </div>
    </a>
  )
}
function Schematic({
  items,
  onSelect,
}: {
  items: Facility[]
  onSelect: (f: Facility) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [layer, setLayer] = useState<'parking' | 'events' | null>(null)
  const layers: [string, number, number][] = [
    ['img', 3.94, 4.15],
    ['img1', 0, 0],
    ['img2', 0, 0],
    ['img3', 0, 0],
    ['img4', 185.43, 178.43],
    ['img5', 191.97, 186.04],
    ['img6', 0, 0],
    ['img7', 0, 0],
    ['img8', 0, 0],
    ['img9', 0, 0],
    ['img10', 0, 0],
  ]
  return (
    <div className="facility-schematic">
      <div
        className="schematic-base"
        style={{ '--schematic-zoom': zoom } as CSSProperties}
      >
        {layers.map(([key, left, top]) => (
          <img
            key={key}
            src={`/figma/facility-home-${key}.svg`}
            alt=""
            style={{ left, top }}
          />
        ))}
        <img
          className="schematic-boundary"
          src="/figma/facility-home-img11.png"
          width="308.503"
          height="255.876"
          alt="시연용 기흥구 경계"
        />
        {items.map((f) => {
          const [left, top] = f.schematicPosition ?? [11, 48]
          const showParking = layer === 'parking'
          return (
            <button
              key={f.id}
              type="button"
              className="facility-map-pin"
              style={{ left, top }}
              onClick={() => onSelect(f)}
            >
              <span className={`status-dot ${statusClass(f)}`} />
              {showParking ? (f.parking?.name ?? '주차 정보 없음') : f.name}
              {layer === 'events' && f.eventIds.length ? ' ⚑' : ''}
            </button>
          )
        })}
        <span className="map-place-label label-gu">구갈동</span>
        <span className="map-place-label label-lake">기흥호수</span>
      </div>
      <div className="facility-map-layers">
        <button
          type="button"
          aria-pressed={layer === 'parking'}
          onClick={() => setLayer(layer === 'parking' ? null : 'parking')}
        >
          Ⓟ 주차장
        </button>
        <button
          type="button"
          aria-pressed={layer === 'events'}
          onClick={() => setLayer(layer === 'events' ? null : 'events')}
        >
          ⚑ 행사
        </button>
      </div>
      <div className="facility-zoom">
        <button
          type="button"
          aria-label="시설 지도 확대"
          onClick={() => setZoom(Math.min(zoom + 0.15, 1.6))}
        >
          +
        </button>
        <button
          type="button"
          aria-label="시설 지도 축소"
          onClick={() => setZoom(Math.max(zoom - 0.15, 0.8))}
        >
          −
        </button>
      </div>
      <div className="facility-map-legend">
        <span>이용 상태</span>
        {['여유', '보통', '혼잡', '정보 없음'].map((label, i) => (
          <span key={label}>
            <img src={`/figma/facility-home-img${12 + i}.svg`} alt="" />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
export function Facilities({
  path,
  query,
}: {
  path: string
  query: URLSearchParams
}) {
  const catalog = useFacilities()
  const { data, error, loading, reload } = catalog
  const mode = path.split('/')[2] ?? 'home'
  const id = path.split('/')[3] ?? ''
  const q = query.get('q') ?? ''
  const cat = query.get('cat') ?? ''
  const town = query.get('town') ?? ''
  const kind = query.get('type') ?? ''
  const [input, setInput] = useState(q)
  const [selected, setSelected] = useState<Facility | null>(null)
  const [official, setOfficial] = useState(false)
  const item = data?.items.find((f) => f.id === id)
  const event = data?.events.find((e) => e.id === id)
  const linked = data?.items.find((f) => f.id === event?.facilityId)
  const results =
    data?.items.filter(
      (f) =>
        (!q || `${f.name} ${f.town}`.includes(q)) &&
        (!cat || f.group === cat) &&
        (!town || f.town === town) &&
        (!kind || kind.split(',').includes(f.type)),
    ) ?? []
  const titles: Record<string, string> = {
    home: '시설 탐색',
    search: '시설 검색',
    results: '검색 결과',
    filters: '검색 조건',
    all: '전체 시설',
    detail: '시설 상세',
    usage: '이용 현황',
    parking: '주차 정보',
    events: '주변 행사',
    event: '행사 상세',
    guide: '이용·데이터 안내',
  }
  const params = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({ q, cat, town, type: kind, ...overrides })
    return p.toString()
  }
  const routeResults = (overrides: Record<string, string> = {}) =>
    go('/facilities/results?' + params(overrides))
  const officialAction = () => {
    const url = safeUrl(item?.source.url ?? linked?.source.url)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else setOfficial(true)
  }
  let content
  if (loading) content = <p role="status">시설 정보를 불러오는 중이에요…</p>
  else if (error && !data)
    content = (
      <div className="facility-info">
        <h2>시설 정보를 불러오지 못했어요</h2>
        <p>{error}</p>
        <button type="button" className="primary" onClick={() => void reload()}>
          다시 불러오기
        </button>
      </div>
    )
  else if (mode === 'home')
    content = (
      <>
        <section className="facility-search-box">
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              routeResults({ q: input })
            }}
          >
            <input
              aria-label="시설명 또는 동 이름 검색"
              placeholder="⌕  시설명 또는 동 이름 검색"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="text-button small">
              ×
            </button>
          </form>
          <div className="chips">
            <button
              type="button"
              className="chip active"
              onClick={() => go('/facilities/all')}
            >
              전체
            </button>
            {groups.map((g) => (
              <button
                type="button"
                className="chip"
                key={g}
                onClick={() => routeResults({ cat: g })}
              >
                {g}
              </button>
            ))}
          </div>
        </section>
        {data?.items.every((f) => f.source.isDemo) ? (
          <Schematic items={results} onSelect={setSelected} />
        ) : (
          <Suspense fallback={<p>지도 준비 중…</p>}>
            <PlaceMap
              places={results}
              selectedId={selected?.id}
              onSelect={(p) =>
                setSelected(results.find((f) => f.id === p.id) ?? null)
              }
            />
          </Suspense>
        )}
        {selected && (
          <section className="facility-info">
            <div className="row between">
              <h2>{selected.name}</h2>
              <button
                className="text-button"
                type="button"
                onClick={() => setSelected(null)}
              >
                닫기
              </button>
            </div>
            <p>{selected.address}</p>
            <Status facility={selected} />
            <a
              className="secondary"
              href={`#/facilities/detail/${selected.id}`}
            >
              시설 상세 보기 →
            </a>
          </section>
        )}
        <div className="row between">
          <h2>시설 {results.length}곳</h2>
          <a className="tiny muted" href="#/facilities/all">
            전체 목록 보기 ↗
          </a>
        </div>
        {results.map((f) => (
          <FacilityCard facility={f} key={f.id} />
        ))}
        <a className="secondary" href="#/facilities/events">
          주변 행사 보기 →
        </a>
      </>
    )
  else if (mode === 'search')
    content = (
      <>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault()
            routeResults({ q: input })
          }}
        >
          <label className="field">
            시설명 또는 동 이름
            <div className="row">
              <input
                autoFocus
                aria-label="시설명 또는 동 이름"
                value={input}
                placeholder="구갈동"
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="button"
                className="text-button"
                aria-label="시설 검색어 지우기"
                onClick={() => setInput('')}
              >
                ×
              </button>
            </div>
          </label>
          <section className="stack">
            <h2>시연용 추천 검색어</h2>
            <div className="chips">
              {['구갈동', '수영장', '기흥 생활수영장', '구성동'].map((t) => (
                <button
                  className="chip"
                  type="button"
                  key={t}
                  onClick={() => setInput(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="tiny muted">검색 기록이 아닌 시연용 추천어입니다.</p>
          </section>
          <section className="stack">
            <h2>어디까지 검색하나요?</h2>
            <div className="facility-info">
              <strong>용인시 기흥구 · 가상 시설 8곳</strong>
              <p>
                등록된 시설명이나 동 이름으로 찾습니다. 지역명을 입력하면 해당
                동의 시설을 함께 볼 수 있어요.
              </p>
              <p className="tiny muted">
                실제 지도나 현재 위치를 이용한 검색은 제공하지 않습니다.
              </p>
            </div>
          </section>
          <a
            className="secondary"
            href={`#/facilities/filters?${params({ q: input })}`}
          >
            조건을 골라 찾기 · 필터 ›
          </a>
          <button className="primary" type="submit">
            {input || '시설'} 검색하기
          </button>
        </form>
      </>
    )
  else if (mode === 'filters')
    content = (
      <FacilityFilters
        query={q}
        cat={cat}
        town={town}
        kind={kind}
        data={data}
      />
    )
  else if (mode === 'all' || mode === 'results')
    content = (
      <>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            routeResults({ q: input })
          }}
        >
          <input
            aria-label="시설 검색 결과 검색어"
            placeholder="시설명 또는 동 이름 검색"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="text-button"
            type="button"
            aria-label="시설 검색어 지우기"
            onClick={() => {
              setInput('')
              routeResults({ q: '' })
            }}
          >
            ×
          </button>
        </form>
        <div className="row">
          <a
            className="secondary grow"
            href={`#/facilities/search?${params({})}`}
          >
            검색 수정
          </a>
          <a
            className="secondary grow"
            href={`#/facilities/filters?${params({})}`}
          >
            필터
          </a>
        </div>
        {mode === 'all' && (
          <div className="chips">
            {['', ...groups].map((g) => (
              <button
                className={`chip ${cat === g ? 'active' : ''}`}
                type="button"
                key={g}
                onClick={() => routeResults({ cat: g })}
              >
                {g || '전체'}
              </button>
            ))}
          </div>
        )}
        <div className="chips">
          <span className="chip">{cat || '카테고리 전체'}</span>
          <span className="chip">{town || '동네 전체'}</span>
        </div>
        <div className="row between">
          <h2>
            {mode === 'all' ? '전체 시설' : '검색 결과'} {results.length}곳
          </h2>
          <a className="chip" href={`#/facilities?${params({})}`}>
            지도 보기
          </a>
        </div>
        {results.length ? (
          results.map((f) => <FacilityCard facility={f} key={f.id} />)
        ) : (
          <>
            <section className="facility-empty">
              <span className="search-orb">⌕</span>
              <h2>조건에 맞는 시설을 찾지 못했어요</h2>
              <p>
                등록된 가상 시설 {data?.items.length ?? 0}곳에 ‘{q}’이 없습니다.
                실제 지역에 시설이 없다는 의미는 아닙니다.
              </p>
            </section>
            <a className="primary" href={`#/facilities/search?${params({})}`}>
              검색 수정
            </a>
            <button
              className="secondary"
              type="button"
              onClick={() => routeResults({ cat: '', town: '', type: '' })}
            >
              필터 초기화
            </button>
            <p className="tiny muted">필터만 초기화되며 검색어는 유지됩니다.</p>
            <a className="secondary" href="#/facilities/all">
              조건 없이 전체 시설 보기 ›
            </a>
          </>
        )}
        <p className="tiny muted">
          이용 인원은 시설 내부 기준입니다. ‘정보 없음’은 0명이나 여유를 뜻하지
          않습니다.
        </p>
      </>
    )
  else if (mode === 'detail' && item)
    content = (
      <>
        <div className="stack">
          <p className="tiny muted">
            {item.group} / {item.type} · {item.town}
            {item.source.isDemo ? ' · 가상 시설' : ''}
          </p>
          <h1>{item.name}</h1>
          <p className="small">{item.address}</p>
        </div>
        {item.occupancy ? (
          <>
            <section className="facility-info">
              <div className="row between">
                <strong>현재 이용 현황</strong>
                <Status facility={item} />
              </div>
              <p>
                <strong className="metric">{item.occupancy.current}명</strong>
                <span className="tiny muted">
                  {' '}
                  / {item.source.isDemo ? '가상 ' : ''}정원{' '}
                  {item.occupancy.capacity}명
                </span>
              </p>
              <p className="tiny muted">
                {item.source.isDemo ? '시연 ' : ''}기준{' '}
                {time(item.occupancy.observedAt)} · 갱신{' '}
                {time(item.occupancy.updatedAt)}
              </p>
              <a className="secondary" href={`#/facilities/usage/${item.id}`}>
                이용 현황과 판정 기준 보기 ›
              </a>
            </section>
            <h2>운영 및 이용 안내</h2>
            <section className="facility-info">
              <p className="tiny muted">운영시간</p>
              <p>{item.openingHours || '운영시간 정보 없음'}</p>
              <p className="tiny muted">정기 휴관</p>
              <p>{item.holiday || '정보 없음'}</p>
              <p className="tiny muted">방문 전 확인</p>
              <p>
                세부 이용 시간, 이용 방법과 요금은 공식 정보에서 확인해 주세요.
              </p>
            </section>
            <h2>주차</h2>
            <section className="facility-info">
              <strong>
                {item.parking?.name ?? '연결된 주차장 정보 없음'} ·{' '}
                {item.parking?.type}
              </strong>
              <p>
                {item.parking?.available !== null && item.parking
                  ? `잔여 ${item.parking.available} / 전체 ${item.parking.total}면`
                  : '현황 미제공'}
              </p>
              <a className="secondary" href={`#/facilities/parking/${item.id}`}>
                주차 정보 상세 ›
              </a>
            </section>
            <h2>연결 행사</h2>
            {data?.events
              .filter((e) => e.facilityId === item.id)
              .map((e) => (
                <section className="facility-info" key={e.id}>
                  <span className="tiny muted">예정 · 가상 행사</span>
                  <strong>{e.name}</strong>
                  <p>시연 기준 {e.schedule}</p>
                  <a className="secondary" href={`#/facilities/event/${e.id}`}>
                    행사 상세 보기 ›
                  </a>
                </section>
              ))}
          </>
        ) : (
          <>
            <span className="facility-status unknown">정보 미제공</span>
            <h2>확인 가능한 기본 정보</h2>
            <section className="facility-info">
              <p className="tiny muted">시설 분류</p>
              <p>{item.description}</p>
              <p className="tiny muted">등록 주소</p>
              <p>{item.address}</p>
            </section>
            <h2>아직 제공되지 않은 정보</h2>
            <section className="facility-info">
              <p>운영시간 {item.openingHours || '정보 없음'}</p>
              <p>시설 내부 이용 현황 미제공</p>
              <p>{item.parking?.name ?? '연결된 주차장 정보 없음'}</p>
              <p>
                {item.eventIds.length
                  ? '연결 행사 있음'
                  : '연결된 행사 정보 없음'}
              </p>
              <p className="tiny muted">관측 수치가 없어 기준 시각도 미제공</p>
            </section>
            <p className="facility-alert">
              정보가 없다는 것은 ‘0명’ 또는 ‘여유’라는 뜻이 아닙니다. 운영
              중인지, 주차가 가능한지, 행사가 없는지도 단정할 수 없습니다.
            </p>
            <h2>방문 전에는 이렇게 확인하세요</h2>
            <p>
              운영시간·휴관·이용 방법과 주차 가능 여부는 공식 정보를 확인해
              주세요.
            </p>
          </>
        )}
        <div className="row">
          <button
            className="secondary grow"
            type="button"
            onClick={officialAction}
          >
            공식 정보 확인 ↗
          </button>
          <a className="primary grow" href={`#/facilities/parking/${item.id}`}>
            길찾기 안내 ↗
          </a>
        </div>
      </>
    )
  else if (mode === 'usage' && item)
    content = (
      <>
        <h2>{item.name}</h2>
        <section className="facility-info">
          <div className="row between">
            <span className="tiny">
              {item.source.isDemo ? '가상 ' : ''}정원 대비 이용률
            </span>
            <Status facility={item} />
          </div>
          <strong className="metric">
            {item.occupancy
              ? `${Math.round((item.occupancy.current / item.occupancy.capacity) * 100)}%`
              : '정보 없음'}
          </strong>
          {item.occupancy && (
            <>
              <strong className="small">
                현재 {item.occupancy.current}명 / 가상 정원{' '}
                {item.occupancy.capacity}명
              </strong>
              <progress
                max={item.occupancy.capacity}
                value={item.occupancy.current}
              />
              <p className="tiny muted">
                {item.occupancy.current} ÷ {item.occupancy.capacity} × 100. 시연
                수치이며 실시간 측정이 아닙니다.
              </p>
            </>
          )}
        </section>
        <h2>언제 관측한 정보인가요?</h2>
        <section className="facility-info">
          <p className="tiny muted">
            관측 시연 기준 {time(item.occupancy?.observedAt)}
          </p>
          <p>표시 정보 갱신 {time(item.occupancy?.updatedAt)}</p>
          <p className="tiny muted">실제 시각과 다른 시연 예시입니다.</p>
        </section>
        <h2>혼잡 상태 판정 기준</h2>
        <section className="facility-info">
          <p>
            <span className="facility-status free">여유</span> 50% 미만
          </p>
          <p>
            <span className="facility-status moderate">보통</span> 50~79%
          </p>
          <p>
            <span className="facility-status busy">혼잡</span> 80% 이상
          </p>
          <p className="tiny muted">
            시설 내부 인원 ÷ 정원으로 구분합니다. 수치가 없으면 정보 없음이며
            여유로 판단하지 않습니다.
          </p>
        </section>
        <h2>출처와 해석 시 주의사항</h2>
        <p className="small">
          시연용 가상 데이터로 실제 센서·공공데이터와 연결되지 않았습니다. 시설
          내부 인원과 주차 잔여 면수는 다른 지표입니다.
        </p>
        <a className="secondary" href={`#/facilities/detail/${item.id}`}>
          {item.name}으로 돌아가기
        </a>
      </>
    )
  else if (mode === 'parking' && item)
    content = (
      <>
        <h2>{item.parking?.name ?? '주차 정보 없음'}</h2>
        <p className="tiny muted">
          {item.name} · {item.parking?.type ?? '연결 주차장 없음'}
        </p>
        <section className="facility-info">
          <span className="tiny">주차 잔여 면수</span>
          <p>
            <strong className="metric">
              {item.parking?.available === null || !item.parking
                ? '정보 없음'
                : `${item.parking.available}면`}
            </strong>
            <span className="tiny muted">
              {' '}
              / 전체 {item.parking?.total ?? '미확인'}면
            </span>
          </p>
          <p className="tiny muted">
            기준 {time(item.parking?.observedAt)} · 시설 내부 이용 인원과는
            별개입니다.
          </p>
        </section>
        <h2>시설과 주차장 연결 관계</h2>
        <div className="parking-diagram">
          <span>
            {item.name}
            <small>시설</small>
          </span>
          <i />
          <span>
            {item.parking?.name ?? '연결 정보 없음'}
            <small>{item.parking?.type}</small>
          </span>
          <p>시설에 연결된 주차장 · 경로 안내 아님</p>
        </div>
        <p className="tiny muted">
          실제 축척·거리·입구 위치를 나타내지 않는 모식도입니다.
        </p>
        <h2>방문 전 확인</h2>
        <section className="facility-info">
          <p className="tiny muted">주차 요금</p>
          <p>확인 필요 · 공식 안내에서 확인</p>
          <p className="tiny muted">주차장 운영시간</p>
          <p>확인 필요 · 시설 운영시간과 다를 수 있음</p>
        </section>
        <p className="facility-alert">
          잔여 면수는 시설의 여유 상태를 의미하지 않습니다.
        </p>
        <div className="row">
          <button
            className="secondary grow"
            type="button"
            onClick={officialAction}
          >
            공식 확인 ↗
          </button>
          <button
            className="primary grow"
            type="button"
            onClick={officialAction}
          >
            길찾기 안내 ↗
          </button>
        </div>
      </>
    )
  else if (mode === 'events')
    content = (
      <>
        <h2>시설에서 만나는 행사 {data?.events.length ?? 0}개</h2>
        <p className="tiny muted">
          기흥구의 등록 시설과 연결된{' '}
          {data?.items.every((f) => f.source.isDemo) ? '시연용 ' : ''}
          행사입니다. 현재 위치 기반 가까운 순 정렬은 아닙니다.
        </p>
        <div className="chips">
          <span className="chip active">기흥구 전체</span>
          <span className="chip">예정 {data?.events.length ?? 0}개</span>
        </div>
        {data?.events.map((e) => {
          const f = data.items.find((f) => f.id === e.facilityId)
          return (
            <section className="facility-info" key={e.id}>
              <p className="tiny muted">
                예정 · {f?.source.isDemo ? '가상 행사 · ' : ''}
                {f?.town}
              </p>
              <h2>{e.name}</h2>
              <p className="small">
                {f?.source.isDemo ? '시연 기준 ' : ''}
                {e.schedule}
              </p>
              <a
                className="small facility-green strong"
                href={`#/facilities/detail/${e.facilityId}`}
              >
                {f?.name} ›
              </a>
              <p className="tiny muted">{f?.description}</p>
              <a className="secondary" href={`#/facilities/event/${e.id}`}>
                행사 상세 보기 ›
              </a>
            </section>
          )
        })}
        {!data?.events.length && (
          <p className="facility-info">연결된 행사 정보가 없어요.</p>
        )}
        <p className="tiny muted">
          장소·일정·신청 방식은 공식 안내를 확인해야 합니다.
        </p>
      </>
    )
  else if (mode === 'event' && event && linked)
    content = (
      <>
        <span className="tiny muted">
          예정 · {linked.source.isDemo ? '가상 행사' : ''}
        </span>
        <h1>{event.name}</h1>
        <p className="small muted">연결 시설 · {linked.name}</p>
        <h2>행사 기본 정보</h2>
        <section className="facility-info">
          <p className="tiny muted">
            {linked.source.isDemo ? '시연 일정' : '일정'}
          </p>
          <p>{event.schedule}</p>
          <p className="tiny muted">연결 장소</p>
          <p>
            {linked.name} · {linked.town}
          </p>
          <p className="tiny muted">시설 주소</p>
          <p>{linked.address}</p>
          <p className="tiny muted">
            시연 표기는 실제 개최 확정 정보가 아닙니다.
          </p>
        </section>
        <h2>참여 전 공식 확인</h2>
        <section className="facility-info">
          <p>
            장소·일정·신청 방식은 모두 공식 확인이 필요합니다. 가격과 정원
            정보는 제공하지 않습니다.
          </p>
          <p className="tiny muted">
            이 앱에서는 행사 신청·예약·결제를 받지 않습니다.
          </p>
        </section>
        <a className="secondary" href={`#/facilities/detail/${linked.id}`}>
          {linked.name} 시설 정보로 이동 ›
        </a>
        <button className="primary" type="button" onClick={officialAction}>
          공식 안내 확인 ↗
        </button>
      </>
    )
  else if (mode === 'guide') content = <FacilityGuide />
  else
    content = (
      <section className="facility-info">
        <h2>시설 정보를 찾을 수 없어요</h2>
        <a className="primary" href="#/facilities/all">
          전체 시설에서 찾기
        </a>
      </section>
    )
  return (
    <div className={`facility-app facility-mode-${mode}`}>
      <header
        className={`facility-header ${mode === 'home' ? 'facility-home-header' : ''}`}
      >
        <a href="#/facilities" className="row">
          <span className="facility-logo">ㄱ</span>
          <span>
            <strong>용인데이</strong>
            {mode === 'home' && (
              <small className="facility-brand-subtitle">YONGIN DAY</small>
            )}
          </span>
        </a>
        <a
          className="tiny muted"
          href={mode === 'home' ? '#/facilities/guide' : '#/'}
        >
          {mode === 'home' ? '이용 안내 ↗' : '기흥구 · 비회원'}
        </a>
        {mode === 'home' && (
          <p className="facility-alert tiny">
            {data?.items.every((f) => f.source.isDemo)
              ? '모든 시설·주소·수치·행사는 시연용 가상 데이터입니다.'
              : '출처의 관측 시각과 정보 갱신 시각을 확인해 주세요.'}
          </p>
        )}
      </header>
      {mode !== 'home' && (
        <div className="facility-page-title">
          <button
            className="secondary"
            type="button"
            aria-label="시설 화면 뒤로"
            onClick={() => {
              if (Number(history.state?.yonginDepth) > 0) history.back()
              else go('/facilities')
            }}
          >
            ‹
          </button>
          <div>
            <small className="tiny muted">
              용인데이 › {item?.name ?? '홈'}
            </small>
            <h1>{titles[mode] ?? '시설 정보'}</h1>
          </div>
        </div>
      )}
      <main className="facility-content">
        {mode !== 'home' && (
          <p className="facility-alert tiny">
            {data?.items.every((f) => f.source.isDemo)
              ? '모든 시설·주소·수치·행사는 시연용 가상 데이터입니다.'
              : '출처의 관측 시각과 정보 갱신 시각을 확인해 주세요.'}
          </p>
        )}
        {error && data && (
          <p className="error small" role="alert">
            {error} 마지막으로 확인한 정보를 표시합니다.
          </p>
        )}
        {content}
      </main>
      <footer className="facility-footer">
        <a href="#/facilities/guide">이용 안내 및 데이터 안내 ›</a>
        <a href="#/">용마실 행사 찾기로 돌아가기 ›</a>
      </footer>
      {official && (
        <Modal title="공식 안내 확인" onClose={() => setOfficial(false)}>
          <p className="small muted">
            {item?.source.isDemo || linked?.source.isDemo
              ? '시연용 가상 시설로 외부 공식 페이지와 연결되지 않았습니다.'
              : '등록된 공식 링크가 없습니다. 방문 전에 운영 기관의 안내를 확인해 주세요.'}
          </p>
          <button
            className="secondary"
            type="button"
            onClick={() => setOfficial(false)}
          >
            확인했어요
          </button>
        </Modal>
      )}
    </div>
  )
}
function FacilityFilters({
  query,
  cat,
  town,
  kind,
  data,
}: {
  query: string
  cat: string
  town: string
  kind: string
  data: FacilityCatalog | null
}) {
  const [category, setCategory] = useState(cat)
  const [selectedTown, setTown] = useState(town)
  const [selectedTypes, setTypes] = useState(
    kind ? kind.split(',') : ([] as string[]),
  )
  const matches =
    data?.items.filter(
      (f) =>
        (!query || `${f.name} ${f.town}`.includes(query)) &&
        (!category || f.group === category) &&
        (!selectedTown || f.town === selectedTown) &&
        (!selectedTypes.length || selectedTypes.includes(f.type)),
    ).length ?? 0
  return (
    <>
      <p className="tiny muted">
        검색어 ‘{query || '전체'}’는 유지됩니다. 카테고리·종류·동네를 선택해
        보세요.
      </p>
      <h2>카테고리와 시설 종류</h2>
      <button
        type="button"
        className="chip"
        onClick={() => {
          setCategory('')
          setTypes([])
        }}
      >
        전체 카테고리
      </button>
      {groups.map((g) => (
        <section className="facility-info" key={g}>
          <label className="facility-checkbox">
            <input
              type="checkbox"
              checked={category === g}
              onChange={() => {
                setCategory(category === g ? '' : g)
                setTypes([])
              }}
            />
            {g}
          </label>
          <div className="chips">
            {types[g].map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${selectedTypes.includes(t) ? 'active' : ''}`}
                onClick={() => {
                  setCategory(g)
                  setTypes(
                    selectedTypes.includes(t)
                      ? selectedTypes.filter((v) => v !== t)
                      : [...selectedTypes, t],
                  )
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      ))}
      <h2>동네</h2>
      <div className="chips">
        {['', ...towns].map((t) => (
          <button
            className={`chip ${selectedTown === t ? 'active' : ''}`}
            type="button"
            key={t}
            onClick={() => setTown(t)}
          >
            {t || '전체 동네'}
          </button>
        ))}
      </div>
      <h2>적용할 조건</h2>
      <section className="facility-info">
        <strong className="small">
          {category || '전체 카테고리'} ·{' '}
          {selectedTypes.join('/') || '전체 종류'} ·{' '}
          {selectedTown || '전체 동네'}
        </strong>
        <p className="small">
          검색어 ‘{query || '전체'}’와 선택한 조건으로 {matches}곳을 표시합니다.
        </p>
        <p className="tiny muted">
          초기화하면 필터만 해제됩니다. 거리·가격 조건은 제공하지 않습니다.
        </p>
      </section>
      <div className="row">
        <button
          className="secondary grow"
          type="button"
          onClick={() => {
            setCategory('')
            setTown('')
            setTypes([])
          }}
        >
          초기화
        </button>
        <button
          className="primary grow"
          type="button"
          onClick={() =>
            go(
              '/facilities/results?' +
                new URLSearchParams({
                  q: query,
                  cat: category,
                  town: selectedTown,
                  type: selectedTypes.join(','),
                }),
            )
          }
        >
          결과 {matches}곳 보기
        </button>
      </div>
    </>
  )
}
function FacilityGuide() {
  return (
    <>
      <h2>시설을 찾는 세 단계</h2>
      <section className="facility-info">
        {[
          [
            '검색하기',
            '시설명·동 이름을 입력하거나 카테고리와 동네를 선택하세요.',
          ],
          [
            '시설 선택하기',
            '지도 또는 목록에서 시설을 고르고 기본 정보를 살펴보세요.',
          ],
          [
            '이용·주차·행사 확인하기',
            '관측 기준 시각과 미제공 여부를 확인한 뒤 공식 안내를 확인하세요.',
          ],
        ].map(([t, b], i) => (
          <div className="row facility-guide-step" key={t}>
            <span className="number-badge">{i + 1}</span>
            <div>
              <strong>{t}</strong>
              <p className="tiny muted">{b}</p>
            </div>
          </div>
        ))}
      </section>
      <h2>이용 상태는 이렇게 읽어요</h2>
      <section className="facility-info">
        <p>
          <span className="facility-status free">여유</span> 가상 정원 대비 50%
          미만
        </p>
        <p>
          <span className="facility-status moderate">보통</span> 50~79%
        </p>
        <p>
          <span className="facility-status busy">혼잡</span> 80% 이상
        </p>
        <p>
          <span className="facility-status unknown">정보 없음</span> 인원·정원
          등 관측 정보 미제공
        </p>
        <p className="tiny muted">
          정보 없음은 0명 또는 여유가 아닙니다. 시설 이용 인원과 주차 면수는
          다른 지표입니다.
        </p>
      </section>
      <h2>기준 시각을 먼저 확인하세요</h2>
      <section className="facility-info">
        <p className="small">관측 기준 14:00 관측 · 14:05 갱신</p>
        <p className="tiny muted">
          관측 시각은 수치의 기준, 갱신 시각은 표시 정보의 갱신 기준입니다. 시연
          기준은 실제 현재 시각을 뜻하지 않습니다.
        </p>
      </section>
      <h2>데이터와 모식도 안내</h2>
      <section className="facility-info">
        <p className="small">
          시연 모드의 시설명·주소·이용 인원·정원·주차 수치·행사는 가상
          데이터입니다.
        </p>
        <p className="tiny muted">
          지도와 주차 모식도는 관계를 설명하는 예시이며 실제 축척·위치·거리·진입
          경로를 나타내지 않습니다.
        </p>
      </section>
      <h2>연동되지 않은 서비스</h2>
      <section className="facility-info">
        <p className="small">
          시연 상태는 실제 센서·공공데이터·공식 지도 API와 연결되지 않았습니다.
          신청·예약·결제를 진행하지 않습니다.
        </p>
      </section>
      <h2>공식 정보 확인이 필요한 항목</h2>
      <p className="small">
        시설 운영시간·휴관·이용 방법·요금
        <br />
        주차 가능 여부·요금·운영시간
        <br />
        행사 실제 장소·일정·신청 방식
      </p>
      <a className="primary" href="#/facilities">
        시설 탐색으로 돌아가기
      </a>
    </>
  )
}
