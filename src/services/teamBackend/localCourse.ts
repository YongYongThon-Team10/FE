import type { Itinerary } from './contracts'
import type { Course, CourseStop, Place } from '@/domain/models'
import { parseCourse } from '@/domain/validation'

export function localFestivalCourse(data: Itinerary): Course {
  const createdAt = new Date().toISOString()
  const notes = [
    ...new Set(data.warnings.map((w) => w.message)),
    '행사 서버에서 가져온 브라우저 편집본입니다. 시간·요금은 제안 또는 미확인 정보일 수 있어요.',
  ]
  const stops: CourseStop[] = data.slots.map((s) => {
    const kind: CourseStop['kind'] =
      s.type === 'event'
        ? 'arrival'
        : s.type === 'nearbyEvent'
          ? 'nearby'
          : s.type === 'program'
            ? 'program'
            : s.type === 'meal'
              ? 'meal'
              : s.type === 'return'
                ? 'return'
                : 'custom'
    const coords =
      s.place &&
      Number.isFinite(s.place.lat) &&
      Number.isFinite(s.place.lng) &&
      Math.abs(s.place.lat!) <= 90 &&
      Math.abs(s.place.lng!) <= 180
        ? { lat: s.place.lat!, lng: s.place.lng! }
        : null
    // Return locations are excluded from local and shared snapshots. BE meals can
    // be samples, so real food must be chosen through the Kakao nearby search.
    const place: Place | null =
      s.place && kind !== 'return' && kind !== 'meal'
        ? {
            id: `team:${s.eventId ?? s.slotId}`,
            name: s.place.name ?? s.title ?? '장소 미정',
            description: s.description ?? '',
            category: 'culture',
            district: '',
            address: s.place.address ?? '',
            location: coords,
            imageUrl:
              s.eventId === data.baseEventId ? data.coverImageUrl : null,
            price: s.costAmount,
            durationMinutes: Math.max(1, s.durationMin ?? 1),
            openingHours: '',
            source: {
              name: '공식 행사 정보',
              url: s.eventId
                ? `#/festivals/${encodeURIComponent(s.eventId)}`
                : null,
              updatedAt: createdAt,
              isDemo: false,
            },
          }
        : null
    return {
      id: s.slotId,
      kind,
      title: kind === 'return' ? '귀가' : (s.title ?? '장소 미정'),
      place,
      durationMinutes: s.durationMin ?? 0,
      startTime: s.startTime,
      endTime: s.endTime,
      travelMinutes:
        kind === 'return' ? null : (s.moveFromPrev?.estimatedMinutes ?? null),
      missingReason:
        kind === 'return'
          ? '귀가 장소는 보관하지 않아요. 실제 길찾기는 출발지를 다시 확인해 주세요.'
          : kind === 'meal'
            ? '실제 음식점은 조건 바꾸기에서 선택해 주세요.'
            : !place
              ? '장소 정보가 없어요.'
              : null,
    }
  })
  return parseCourse({
    id: crypto.randomUUID(),
    eventId: `team:${data.baseEventId}`,
    name: data.title ?? '행사 하루 일정',
    createdAt,
    isDemo: false,
    planned: true,
    notes,
    stops,
    settings: {
      date: data.date,
      companion: '친구와',
      childAge: null,
      transport: { walk: '도보', car: '자가용', transit: '대중교통' }[
        data.transport ?? 'transit'
      ],
      origin: '',
      originLocation: null,
      startTime: data.timeWindow.start ?? '10:00',
      endTime: data.timeWindow.end ?? '18:00',
      budget: null,
      activities: ['먹거리', '휴식'],
    },
  })
}
