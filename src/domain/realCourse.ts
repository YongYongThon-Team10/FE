import type { Category, Course, Place } from './models'
import type { SearchPlace } from '@/services/places'
import { dateKey, recalculate } from './planning'
import { photoCandidates } from './images'
export const isRealCourse = (course: Course) =>
  /^(kakao:|team:)/.test(course.eventId) && !course.isDemo
export const placeCategory = (place: SearchPlace): Category =>
  (
    ({
      FD6: 'food',
      CE7: 'cafe',
      CT1: 'culture',
      AT4: 'park',
      MT1: 'shopping',
    }) as Record<string, Category>
  )[place.categoryGroup] ?? 'park'
export function realPlace(
  place: SearchPlace,
  fetchedAt = new Date().toISOString(),
): Place {
  return {
    id: `kakao:${place.id}`,
    name: place.name,
    description: place.category,
    category: placeCategory(place),
    district: place.address.match(/용인시\s+(\S+구)/)?.[1] ?? '',
    address: place.roadAddress || place.address,
    location: place.location,
    imageUrl: place.imageUrl ?? null,
    thumbnailUrl: place.thumbnailUrl,
    imageCredit: place.imageCredit,
    price: null,
    durationMinutes:
      place.categoryGroup === 'FD6' || place.categoryGroup === 'CE7' ? 60 : 120,
    openingHours: '',
    source: {
      name: '카카오맵',
      url: place.url,
      updatedAt: fetchedAt,
      isDemo: false,
    },
  }
}
export function createRealCourse(place: SearchPlace): Course {
  const anchor = realPlace(place)
  const photo = photoCandidates(anchor.name, anchor)[0]
  if (photo) {
    anchor.imageUrl = photo.src
    anchor.imageCredit = photo.credit
  }
  return recalculate({
    id: crypto.randomUUID(),
    name: `${place.name} 중심 하루`,
    eventId: anchor.id,
    isDemo: false,
    createdAt: new Date().toISOString(),
    settings: {
      date: dateKey(),
      companion: '친구와',
      childAge: null,
      transport: '도보',
      origin: '',
      originLocation: null,
      startTime: '10:00',
      endTime: '18:00',
      budget: null,
      activities: ['먹거리', '휴식'],
    },
    stops: [
      {
        id: crypto.randomUUID(),
        kind: 'arrival',
        title: anchor.name,
        place: anchor,
        durationMinutes: 120,
        travelMinutes: null,
        missingReason: null,
      },
    ],
  })
}
