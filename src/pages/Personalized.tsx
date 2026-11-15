import { useState } from 'react'
import { useApp } from '../state/context'
import { categoryNames } from '../domain/models'
import { categories } from '../domain/models'
import type { Category, Coordinate } from '../domain/models'
import type { RecommendedItem } from '../domain/personalization'
import { useLiveRecommendations } from '../hooks/useLiveRecommendations'
import { intelligenceMode } from '../services/intelligence'
import { demoTimes } from '../data/intelligenceDemo'
import { CrowdingButton } from '@/components/PlaceCrowding'
import { previewCrowding } from '@/data/crowdingPreview'

const timeLabel = (at: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(at))
function RecommendationCard({ item }: { item: RecommendedItem }) {
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
        <CrowdingButton
          name={item.name}
          estimate={
            item.crowding ??
            (intelligenceMode === 'mock' ? previewCrowding(item.name) : null)
          }
        />
      </div>
      <h2>{item.name}</h2>
      <p className="small muted">
        {item.address}
        {item.distanceMeters === null
          ? ''
          : ` · ${item.distanceMeters.toLocaleString()}m`}
      </p>
      {item.rating ? (
        <p className="small">
          별점 {item.rating.value.toFixed(1)} / 5, 리뷰{' '}
          {item.rating.count.toLocaleString()}개{' '}
        </p>
      ) : (
        <p className="tiny muted">별점 정보 없음</p>
      )}
      {item.review ? (
        <p className="review-summary">{item.review.summary}</p>
      ) : (
        <p className="tiny muted">리뷰 정보 없음</p>
      )}
      <div className="row">
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
            장소 자세히
          </a>
        )}
      </div>
      <details className="recommendation-info">
        <summary>추천 이유와 정보 출처</summary>
        <ul className="recommendation-reasons">
          {item.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p className="tiny muted">
          {item.source.name} · {timeLabel(item.source.fetchedAt)} 기준
        </p>
        {item.rating && (
          <p className="tiny muted">별점 출처 · {item.rating.source}</p>
        )}
        {item.review && (
          <p className="tiny muted">리뷰 출처 · {item.review.source}</p>
        )}
      </details>
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
  const [liveAt] = useState(() => new Date().toISOString())
  const [locationMessage, setLocationMessage] = useState('')
  const resource = useLiveRecommendations({
    query: submitted,
    profile: app.tasteProfile,
    center,
    radiusMeters: radius,
    categories: filter,
    visitAt: intelligenceMode === 'mock' ? demoTimes[0] : liveAt,
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
    <div className="stack personalization-page recommendations-page">
      <section className="panel stack">
        <h1>어디로 가볼까요?</h1>
        <p className="small muted">
          {centerName} 주변에서 내 취향에 맞는 장소를 찾아요.
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            if (submitted === query.trim()) resource.retry()
            else setSubmitted(query.trim())
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
            추천받기
          </button>
        </form>
        <div className="recommendation-suggestions" aria-label="추천 검색어">
          {['조용한 카페', '한식 맛집', '가볍게 산책'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion)
                setSubmitted(suggestion)
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <details className="recommendation-filters">
          <summary>
            추천 조건 조정
            <span>
              {filter.length === 2
                ? '맛집과 카페'
                : filter.length
                  ? categoryNames[filter[0]]
                  : '전체 장소'}{' '}
              · {radius / 1000}km
            </span>
          </summary>
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
        </details>
        <div className="recommendation-preferences-link">
          <span className="tiny muted">내 취향이 달라졌나요?</span>
          <a className="text-button small" href="#/mypage">
            MY에서 취향 바꾸기 →
          </a>
        </div>
      </section>
      <div className="row between">
        <h2>맞춤 추천 결과</h2>
        <button
          className="text-button small"
          disabled={resource.refreshing}
          onClick={resource.retry}
        >
          다시 추천
        </button>
      </div>
      {resource.refreshing && (
        <p className="info small" role="status">
          취향에 맞는 장소를 고르고 있어요.
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
          <p className="recommendation-result-caption small muted">
            {resource.data.items.length}곳을 찾았어요.
            {resource.data.dataMode === 'simulation'
              ? ' 예시 장소로 추천 기능을 체험하고 있어요.'
              : resource.data.dataMode === 'mixed'
                ? ' 일부 장소 정보는 예시입니다.'
                : ''}
          </p>
          {resource.data.items.length === 0 && (
            <section className="empty-state">
              <h2>조건에 맞는 후보가 없어요</h2>
              <p>검색 조건이나 반경을 바꿔 주세요.</p>
            </section>
          )}
          {resource.data.items.map((item) => (
            <RecommendationCard key={item.id} item={item} />
          ))}
          {resource.data.dataMode !== 'simulation' &&
            resource.data.warnings.length > 0 && (
              <details className="recommendation-info">
                <summary>추천 정보 안내</summary>
                {resource.data.warnings.map((warning) => (
                  <p className="tiny muted" key={warning}>
                    {warning}
                  </p>
                ))}
              </details>
            )}
        </>
      )}
    </div>
  )
}
