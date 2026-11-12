import type { Course, Place } from './models'
export function placeSnapshot(p: Place): Place {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    district: p.district,
    address: p.address,
    location: p.location,
    imageUrl: p.imageUrl,
    price: p.price,
    durationMinutes: p.durationMinutes,
    openingHours: p.openingHours,
    source: {
      name: p.source.name,
      url: p.source.url,
      updatedAt: p.source.updatedAt,
      isDemo: p.source.isDemo,
    },
  }
}
export function courseSnapshot(c: Course, shared = false): Course {
  return {
    id: c.id,
    name: c.name,
    eventId: c.eventId,
    createdAt: c.createdAt,
    isDemo: c.isDemo,
    settings: {
      date: c.settings.date,
      companion: c.settings.companion,
      childAge: shared ? null : c.settings.childAge,
      transport: c.settings.transport,
      origin: shared ? '' : c.settings.origin,
      originLocation: null,
      startTime: c.settings.startTime,
      endTime: c.settings.endTime,
      budget: c.settings.budget,
      activities: c.settings.activities,
    },
    stops: c.stops.map((s, i) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      place:
        s.kind === 'return' ? null : s.place ? placeSnapshot(s.place) : null,
      missingReason:
        shared && s.kind === 'return'
          ? '출발지 정보는 공유하지 않아요.'
          : s.missingReason,
      durationMinutes: s.durationMinutes,
      travelMinutes:
        shared && (i === 0 || s.kind === 'return') ? null : s.travelMinutes,
    })),
  }
}
