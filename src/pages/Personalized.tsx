import { useEffect, useState } from 'react'
import { useApp } from '../state/context'
import { categoryNames } from '../domain/models'
import { categories } from '../domain/models'
import type { Category, Coordinate } from '../domain/models'
import type {
  CrowdingEstimate,
  RecommendedItem,
} from '../domain/personalization'
import { useLiveRecommendations } from '../hooks/useLiveRecommendations'
import { intelligence, intelligenceMode } from '../services/intelligence'
import { demoTimes } from '../data/intelligenceDemo'

const timeLabel = (at: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(at))
const sourceLabel = (source: string) =>
  source === 'openai'
    ? 'OpenAI 판단'
    : source === 'rule_fallback'
      ? '규칙 대체'
      : 'AI 판단 시연 예시'
function CrowdingDetail({ placeId, at }: { placeId: string; at: string }) {
  const [result, setResult] = useState<CrowdingEstimate | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void intelligence
      .crowding(placeId, at, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data)
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : '혼잡도 정보를 불러오지 못했어요.',
          )
      })
    return () => controller.abort()
  }, [placeId, at])
  if (error)
    return (
      <p className="error small" role="alert">
        {error}
      </p>
    )
  if (!result) return <p role="status">혼잡도 근거를 조회하고 있어요.</p>
  return (
    <section className="crowding-detail stack" aria-label="혼잡도 상세">
      <h3>수용인원 대비 체류 인원</h3>
      <p>
        {result.current.estimatedPeople.toLocaleString()}명 /{' '}
        {result.capacity.people.toLocaleString()}명
      </p>
      <p className="small">
        직전 {result.current.previousPeople}명 + 유입{' '}
        {result.current.inflowPeople}명 - 유출 {result.current.outflowPeople}명
      </p>
      <p className="small">
        {sourceLabel(result.predictionSource)} / 신뢰도{' '}
        {result.confidence === 'low'
          ? '낮음'
          : result.confidence === 'medium'
            ? '보통'
            : '높음'}
      </p>
      <ol className="forecast-list">
        {result.forecast.map((window) => (
          <li key={window.at}>
            {timeLabel(window.at)}: {window.label}, {window.occupancyPercent}%
          </li>
        ))}
      </ol>
      {result.warnings.map((warning) => (
        <p className="tiny muted" key={warning.code}>
          {warning.message}
        </p>
      ))}
    </section>
  )
}
function RecommendationCard({
  item,
  selected,
  onDetails,
  at,
}: {
  item: RecommendedItem
  selected: boolean
  onDetails: () => void
  at: string
}) {
  const nearby = new URLSearchParams({
    lat: String(item.location.lat),
    lng: String(item.location.lng),
    categories: 'food,cafe',
    name: item.name,
  })
  return (
    <article
      className="panel stack recommendation-card"
      data-place-id={item.id}
    >
      <div className="row between">
        <span className="tiny blue">{categoryNames[item.category]}</span>
        <span className="recommendation-score">
          추천 {item.score.toFixed(1)}
        </span>
      </div>
      <h2>{item.name}</h2>
      <p className="small muted">
        {item.address}
        {item.distanceMeters === null
          ? ''
          : ` / 기준 위치에서 ${item.distanceMeters.toLocaleString()}m`}
      </p>
      {item.rating ? (
        <p className="small">
          별점 {item.rating.value.toFixed(1)} / 5, 리뷰{' '}
          {item.rating.count.toLocaleString()}개{' '}
          <span className="tiny muted">({item.rating.source})</span>
        </p>
      ) : (
        <p className="tiny muted">별점 정보 없음</p>
      )}
      {item.review ? (
        <p className="review-summary">
          {item.review.summary}
          <span className="tiny muted"> / {item.review.source}</span>
        </p>
      ) : (
        <p className="tiny muted">리뷰 정보 없음</p>
      )}
      <ul className="recommendation-reasons">
        {item.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {item.crowding ? (
        <div className={`crowding-status ${item.crowding.current.level}`}>
          <strong>{item.crowding.current.label}</strong>
          <span>{item.crowding.current.occupancyPercent}%</span>
        </div>
      ) : (
        <p className="tiny muted">혼잡도 정보 없음</p>
      )}
      <p className="tiny muted">
        {item.source.name} /{' '}
        {item.source.dataMode === 'simulation'
          ? '시연 데이터'
          : item.source.dataMode === 'mixed'
            ? '연동 및 시연 데이터 혼합'
            : '연동 데이터'}{' '}
        / {timeLabel(item.source.fetchedAt)} 기준
      </p>
      <div className="row">
        {item.crowdingPlaceId && (
          <button
            className="secondary small"
            onClick={onDetails}
            aria-expanded={selected}
          >
            혼잡도 자세히
          </button>
        )}
        {!['food', 'cafe'].includes(item.category) && (
          <a className="secondary small" href={`#/recommendations?${nearby}`}>
            주변 맛집과 카페
          </a>
        )}
        {item.detailUrl && (
          <a
            className="text-button small"
            href={item.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            장소 출처 보기
          </a>
        )}
      </div>
      {selected && item.crowdingPlaceId && (
        <CrowdingDetail
          key={`${item.crowdingPlaceId}:${at}`}
          placeId={item.crowdingPlaceId}
          at={at}
        />
      )}
    </article>
  )
}
export function Personalized({ params }: { params: string }) {
  const app = useApp()
  const search = new URLSearchParams(params)
  const lat = Number(search.get('lat'))
  const lng = Number(search.get('lng'))
  const validCenter =
    search.has('lat') &&
    search.has('lng') &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
  const [center, setCenter] = useState<Coordinate>(
    validCenter ? { lat, lng } : { lat: 37.2411, lng: 127.1776 },
  )
  const [centerName, setCenterName] = useState(
    validCenter ? search.get('name') || '선택한 장소' : '용인시청 인근',
  )
  const [radius, setRadius] = useState(3000)
  const initialCategories = (search.get('categories') ?? '')
    .split(',')
    .filter((category): category is Category =>
      categories.includes(category as Category),
    )
  const [filter, setFilter] = useState<Category[]>(initialCategories)
  const [query, setQuery] = useState(search.get('q') ?? '')
  const [submitted, setSubmitted] = useState(query)
  const [phase, setPhase] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selected, setSelected] = useState('')
  const [liveAt] = useState(() => new Date().toISOString())
  const [locationMessage, setLocationMessage] = useState('')
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (phase < 3) setPhase(phase + 1)
      else setPlaying(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [playing, phase])
  const resource = useLiveRecommendations({
    query: submitted,
    profile: app.tasteProfile,
    center,
    radiusMeters: radius,
    categories: filter,
    visitAt: intelligenceMode === 'mock' ? demoTimes[phase] : liveAt,
  })
  const locate = async () => {
    try {
      setCenter(await app.locate())
      setCenterName('내 현재 위치')
      setLocationMessage('현재 위치 기준으로 추천을 갱신했어요.')
    } catch (error) {
      setLocationMessage(
        error instanceof Error ? error.message : '위치를 확인하지 못했어요.',
      )
    }
  }
  return (
    <div className="stack personalization-page">
      <section className="panel stack">
        <p className="eyebrow">FOR YOUR DAY</p>
        <h1>취향에 맞는 주변 추천</h1>
        <p className="small">
          마이페이지 선호도, 별점, 리뷰와 예상 혼잡도를 함께 고려해요.
        </p>
        <a className="text-button" href="#/mypage">
          내 취향 바꾸기
        </a>
        <p className="mode-badge">
          {intelligenceMode === 'mock'
            ? '시연 모드: 목업 데이터와 AI 판단 예시'
            : 'BE API 연결 모드'}
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(query.trim())
          }}
        >
          <label className="field">
            원하는 하루
            <input
              value={query}
              maxLength={200}
              placeholder="조용한 카페 또는 한식 맛집"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="primary" type="submit">
            조건으로 추천받기
          </button>
        </form>
        <div className="row">
          <label className="field grow">
            추천 유형
            <select
              aria-label="추천 유형"
              value={filter.length === 2 ? 'nearby' : (filter[0] ?? '')}
              onChange={(event) =>
                setFilter(
                  event.target.value === 'nearby'
                    ? ['food', 'cafe']
                    : event.target.value
                      ? [event.target.value as Category]
                      : [],
                )
              }
            >
              <option value="">전체 취향</option>
              <option value="nearby">맛집과 카페</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryNames[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            검색 반경
            <select
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
            >
              <option value={1000}>1km</option>
              <option value={3000}>3km</option>
              <option value={5000}>5km</option>
            </select>
          </label>
        </div>
        <p className="tiny muted">기준 위치: {centerName}</p>
        {intelligenceMode === 'api' && (
          <button
            className="secondary"
            disabled={app.locating}
            onClick={() => void locate()}
          >
            내 위치에서 추천
          </button>
        )}
        {locationMessage && (
          <p role="status" className="small">
            {locationMessage}
          </p>
        )}
        {intelligenceMode === 'mock' && (
          <div className="stack">
            <label className="field">
              시연 기준 시각
              <select
                aria-label="시연 기준 시각"
                value={phase}
                onChange={(event) => {
                  setPlaying(false)
                  setPhase(Number(event.target.value))
                }}
              >
                {demoTimes.map((at, index) => (
                  <option key={at} value={index}>
                    11월 21일 {timeLabel(at)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              onClick={() => {
                if (phase === 3) setPhase(0)
                setPlaying(!playing)
              }}
            >
              {playing ? '시연 재생 멈추기' : '5초 간격 시연 재생'}
            </button>
          </div>
        )}
      </section>
      <div className="row between">
        <h2>맞춤 추천 결과</h2>
        <button
          className="text-button small"
          disabled={resource.refreshing}
          onClick={resource.retry}
        >
          정보 새로고침
        </button>
      </div>
      {resource.refreshing && (
        <p className="info small" role="status">
          최신 추천 정보를 확인하고 있어요.
        </p>
      )}
      {resource.error && (
        <div className="error" role="alert">
          <p>{resource.error}</p>
          {resource.data && (
            <p>
              마지막 성공 결과를 표시하고 있어요. 최신 정보로 확인되지 않았어요.
            </p>
          )}
          <button className="secondary" onClick={resource.retry}>
            다시 시도
          </button>
        </div>
      )}
      {resource.data && (
        <>
          <p className="tiny muted">
            {resource.data.dataMode === 'simulation' ? '시뮬레이션' : '정보'}{' '}
            기준 {timeLabel(resource.data.sourceAsOf)} /{' '}
            {sourceLabel(resource.data.rankingMethod)} /{' '}
            {resource.data.refreshAfterSeconds}초 간격 조회
          </p>
          {resource.data.warnings.map((warning) => (
            <p className="info small" key={warning}>
              {warning}
            </p>
          ))}
          {resource.data.items.length === 0 && (
            <section className="empty-state">
              <h2>조건에 맞는 후보가 없어요</h2>
              <p>검색 조건이나 반경을 바꿔 주세요.</p>
            </section>
          )}
          {resource.data.items.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              selected={selected === item.id}
              onDetails={() => setSelected(selected === item.id ? '' : item.id)}
              at={item.crowding?.asOf ?? resource.data!.sourceAsOf}
            />
          ))}
        </>
      )}
    </div>
  )
}
