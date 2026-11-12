import type { Coordinate, Event } from '@/domain/models'
import { distanceKm, eventDate, priceText } from '@/domain/planning'
import { safeUrl } from '@/domain/validation'
import { CategoryIcon } from './Brand'
import { go } from '@/hooks/useRoute'

export function EventImage({
  event,
  detail = false,
}: {
  event: Event
  detail?: boolean
}) {
  const poster = /Image[467]\.png$/.test(event.imageUrl ?? '')
  return (
    <div
      className={`event-image ${detail ? 'detail-image' : ''} ${poster ? 'poster' : ''}`}
    >
      {safeUrl(event.imageUrl) ? (
        <img
          src={safeUrl(event.imageUrl)}
          alt={`${event.name} 대표 이미지`}
          loading="lazy"
        />
      ) : (
        <div className="image-placeholder">
          <CategoryIcon category={event.category} size={40} />
        </div>
      )}
      <span className="venue-badge">
        {event.district} ·{' '}
        {event.environment === 'outdoor'
          ? '야외'
          : event.environment === 'indoor'
            ? '실내'
            : '공간 정보 없음'}
      </span>
    </div>
  )
}
export function EventBadges({ event }: { event: Event }) {
  return (
    <div className="badges">
      <span>{priceText(event.price)}</span>
      <span>{event.participation || '신청 정보 없음'}</span>
      {(event.notice || event.conflicts.length > 0) && (
        <button
          type="button"
          className="notice-badge"
          onClick={() => go(`/sources/${encodeURIComponent(event.id)}`)}
        >
          안내 상이 ⓘ
        </button>
      )}
    </div>
  )
}
export function EventCard({
  event,
  origin,
}: {
  event: Event
  origin?: Coordinate | null
}) {
  const path = `/events/${encodeURIComponent(event.id)}`
  return (
    <article className="event-card">
      <a href={`#${path}`}>
        <EventImage event={event} />
      </a>
      <div className="event-card-body">
        <EventBadges event={event} />
        <h3>
          <a href={`#${path}`}>{event.name}</a>
        </h3>
        <p className="small muted">{event.description}</p>
        <p className="coral small">
          {eventDate(event)} · {event.venue}
        </p>
        {origin && (
          <p className="tiny muted">
            {event.location
              ? `내 위치에서 직선 ${distanceKm(origin, event.location).toFixed(1)}km`
              : '거리 정보 없음'}
          </p>
        )}
        <a
          className="source-link tiny"
          href={`#/sources/${encodeURIComponent(event.id)}`}
        >
          출처 안내 · {event.source.isDemo ? '시연 데이터' : event.source.name}{' '}
          ↗
        </a>
        <a className="row event-card-footer" href={`#${path}`}>
          <span className="row">
            <CategoryIcon category={event.category} />
            <strong>
              {event.category === 'park' ? '마켓 · 산책' : '전시 · 공연'}
            </strong>
          </span>
          <span>자세히 보기 ↗</span>
        </a>
      </div>
    </article>
  )
}
