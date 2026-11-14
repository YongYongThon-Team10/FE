import type { ImageFields } from '@/domain/images'
// BE dev 521da004 (2026-11-14). Paths include /api; base URL is the server origin.
export type Companion = 'alone' | 'couple' | 'friends' | 'family' | 'kids'
export type Transport = 'car' | 'transit' | 'walk'
export type Tokens = {
  accessToken: string
  refreshToken: string
  email: string
  name: string
}
export type EventQuery = {
  dateFrom: string
  dateTo?: string
  district?: string[]
  dong?: string[]
  companion?: Companion
  budget?: 'any' | 'free'
  indoorOutdoor?: 'indoor' | 'outdoor' | 'any'
  sort?: 'date' | 'distance'
  lat?: number
  lng?: number
  view?: 'list' | 'map'
  page?: number
  size?: number
}
export type EventItem = ImageFields & {
  eventId: string
  name: string
  summary: string | null
  category: string
  subCategory: string | null
  themeLabel: string | null
  startDate: string | null
  endDate: string | null
  dateStatus: string
  time: string | null
  placeName: string | null
  address: string | null
  district: string | null
  indoorOutdoor: string | null
  lat: number | null
  lng: number | null
  coordPrecision: string | null
  fee: string | null
  isFree: boolean | null
  applyType: string | null
  applyUrl: string | null
  tags: string[]
  sourceUrl: string
  thumbnailUrl: string | null
  distanceKm: number | null
  hasDiscrepancy: boolean
  isLiked: boolean
}
export type EventList = {
  totalCount: number
  page: number
  size: number
  events: EventItem[]
}
export type ParsedSearch = {
  parsed: boolean
  conditions: {
    dateFrom: string | null
    dateTo: string | null
    district: string[] | null
    dong: string[] | null
    companion: Companion | null
    kidsAge: number | null
    budget: 'any' | 'free' | null
    indoorOutdoor: 'indoor' | 'outdoor' | 'any' | null
  }
  unresolved: string[]
  message: string | null
}
export type OriginPlace = {
  name: string
  address: string
  lat: number
  lng: number
}
export type ItineraryInput = {
  baseEventId: string
  date: string
  companion?: Companion
  kidsAge?: number
  origin: {
    type: 'current' | 'manual'
    lat: number
    lng: number
    address?: string
  }
  transport: Transport
  timeWindow: { start: string; end: string }
  budget?: 'any' | 'free'
  wants?: ('food' | 'experience' | 'rest' | 'performance')[]
}
export type Slot = {
  slotId: string
  order: number
  type: string
  title: string | null
  eventId: string | null
  startTime: string | null
  endTime: string | null
  durationMin: number | null
  costAmount: number | null
  costText: string | null
  description: string | null
  timeBasis: string | null
  place: {
    name: string | null
    address: string | null
    lat: number | null
    lng: number | null
  } | null
  isUserAdded: boolean
  moveFromPrev: {
    mode: string
    distanceKm: number | null
    estimatedMinutes: number | null
    isEstimate: boolean
    mapLink: string | null
  } | null
}
export type Itinerary = {
  itineraryId: string
  title: string
  baseEventId: string
  date: string
  transport: Transport
  timeWindow: { start: string; end: string }
  totalCost: number
  costUnknownCount: number
  coverImageUrl: string | null
  isSaved: boolean
  slots: Slot[]
  warnings: { code: string; message: string; slotId?: string }[]
  crowdLevel: number | null
  crowdLabel: string | null
}
export type SavedCourse = {
  courseId: string
  itineraryId: string
  title: string
  isSaved: boolean
  savedAt: string
}
export type CourseList = {
  totalCount: number
  page: number
  size: number
  courses: {
    courseId: string
    itineraryId: string
    title: string
    date: string
    companion: string | null
    transport: Transport
    slotCount: number
    summary: string
    mealSummary: string | null
    coverImageUrl: string | null
    savedAt: string
  }[]
}
