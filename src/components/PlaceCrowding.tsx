import { createPortal } from 'react-dom'
import { Modal } from './Modal'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CrowdingEstimate, CrowdingFields } from '@/domain/personalization'
import { parseCrowding } from '@/domain/personalization'
import { intelligence, intelligenceMode } from '@/services/intelligence'
import { demoTimes } from '@/data/intelligenceDemo'
import { previewCrowding } from '@/data/crowdingPreview'

const crowdingLabels = {
  relaxed: '여유',
  normal: '보통',
  slightly_busy: '약간 붐빔',
  busy: '혼잡',
}
const crowdingAdvice = {
  relaxed: '여유롭게 둘러보기 좋아요.',
  normal: '적당한 활기가 있는 편이에요.',
  slightly_busy: '인기 있는 시간대예요. 여유 있게 방문해 보세요.',
  busy: '붐비는 편이에요. 조금 뒤에 방문해 보세요.',
}
const crowdingTime = (at: string) =>
  new Date(at).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

export function CrowdingSummary({
  estimate,
  compact = false,
}: {
  estimate?: CrowdingEstimate | null
  compact?: boolean
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  if (!estimate)
    return (
      <p className="crowding-unavailable tiny">
        혼잡도 정보 없음 · 방문 전 현장 상황을 확인해 주세요.
      </p>
    )
  const simulation = estimate.dataMode === 'simulation'
  const stale = !simulation && now - Date.parse(estimate.asOf) > 10 * 60 * 1000
  const percent = estimate.current.occupancyPercent
  const level = estimate.current.level
  return (
    <section
      className={`place-crowding crowding-status ${level} ${compact ? 'compact' : ''}`}
      aria-label="예상 혼잡도"
    >
      <div className="crowding-heading">
        <span>예상 혼잡도</span>
        <strong className="crowding-badge">
          <i aria-hidden="true" />
          {crowdingLabels[level]}
        </strong>
      </div>
      <div className="crowding-metrics">
        <strong className="crowding-percentage">
          {percent}
          <small>%</small>
        </strong>
        <span>
          예상 {estimate.current.estimatedPeople.toLocaleString()}명{' '}
          <span className="muted">
            / 정원 {estimate.capacity.people.toLocaleString()}명
          </span>
        </span>
      </div>
      <div
        className="crowding-meter"
        role="meter"
        aria-label="정원 대비 예상 이용률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-valuetext={`${percent}%, ${crowdingLabels[level]}`}
      >
        <span style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="crowding-advice">{crowdingAdvice[level]}</p>
      <p className="crowding-caption">
        {simulation
          ? '목업 예시'
          : estimate.dataMode === 'mixed'
            ? '일부 예시 포함'
            : '예측 정보'}{' '}
        · {crowdingTime(estimate.asOf)} 기준{stale ? ' · 이전 정보' : ''}
      </p>
      {!compact && (
        <details className="crowding-forecast">
          <summary>시간대별 혼잡도 보기</summary>
          <ol>
            {estimate.forecast.map((window) => (
              <li key={window.at}>
                <span>{crowdingTime(window.at)}</span>
                <span className={`crowding-badge ${window.level}`}>
                  {crowdingLabels[window.level]}
                </span>
                <strong>{window.occupancyPercent}%</strong>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

export function CrowdingButton({
  estimate,
  name,
  loading = false,
  error,
  retry,
}: {
  estimate?: CrowdingEstimate | null
  name?: string
  loading?: boolean
  error?: string
  retry?: () => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpened = useRef(false)
  useEffect(() => {
    if (!open) {
      if (wasOpened.current) triggerRef.current?.focus({ preventScroll: true })
      return
    }
    wasOpened.current = true
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
  const level = estimate?.current.level
  const label = loading
    ? '확인 중'
    : level
      ? crowdingLabels[level]
      : '정보 없음'
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`crowding-trigger ${level ?? 'unknown'}`}
        aria-label={`${name ? name + ' ' : ''}혼잡도: ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <Modal
            className="crowding-sheet"
            title="혼잡도 상세"
            onClose={() => setOpen(false)}
          >
            {name && <p className="crowding-place-name">{name}</p>}
            <CrowdingSummary estimate={estimate} />
            {estimate && (
              <p className="tiny muted">
                방문 시간에 따라 달라질 수 있는 예상 정보예요.
              </p>
            )}
            {error && (
              <p className="small muted">
                {error}
                {estimate ? ' 마지막 확인 정보를 표시해요.' : ''}
              </p>
            )}
            {error && retry && (
              <button type="button" className="secondary" onClick={retry}>
                혼잡도 다시 확인
              </button>
            )}
          </Modal>,
          document.body,
        )}
    </>
  )
}

// Only explicit provider IDs are queried. Kakao IDs and place names must not be
// guessed or matched to demonstration places.
export function PlaceCrowding({
  place,
}: {
  place: CrowdingFields & { id?: string; name?: string }
}) {
  const id =
    typeof place.crowdingPlaceId === 'string'
      ? place.crowdingPlaceId.trim()
      : ''
  const snapshot = useMemo(() => {
    try {
      if (!place.crowding) return null
      const data = parseCrowding(place.crowding)
      return !id || data.placeId === id ? data : null
    } catch {
      return null
    }
  }, [place.crowding, id])
  const [attempt, setAttempt] = useState(0)
  const [resource, setResource] = useState<{
    id: string
    data?: CrowdingEstimate
    error?: string
  } | null>(null)
  useEffect(() => {
    if (!id || (snapshot && intelligenceMode === 'mock')) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      try {
        const data = await intelligence.crowding(
          id,
          intelligenceMode === 'mock' ? demoTimes[0] : new Date().toISOString(),
          controller.signal,
        )
        if (!controller.signal.aborted && data.placeId === id)
          setResource({ id, data })
        else if (!controller.signal.aborted)
          throw new Error('장소와 혼잡도 정보가 일치하지 않아요.')
      } catch {
        if (!controller.signal.aborted)
          setResource((old) => ({
            id,
            data: old?.id === id ? old.data : undefined,
            error: '혼잡도를 불러오지 못했어요.',
          }))
      } finally {
        if (!controller.signal.aborted && intelligenceMode === 'api')
          timer = setTimeout(() => void refresh(), 30000)
      }
    }
    void refresh()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [id, snapshot, attempt])
  const current = resource?.id === id ? resource : null
  const preview =
    intelligenceMode === 'mock' &&
    !id &&
    !snapshot &&
    !place.crowdingUnavailable &&
    (place.name || place.id)
      ? previewCrowding(place.name || place.id!)
      : null
  return (
    <CrowdingButton
      key={place.name || place.id || id}
      name={place.name}
      estimate={current?.data ?? snapshot ?? preview}
      loading={Boolean(id && !snapshot && !current)}
      error={current?.error}
      retry={() => setAttempt((n) => n + 1)}
    />
  )
}
