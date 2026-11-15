import type { ImageFields } from './images'
import type { CrowdingFields } from './personalization'
export const categories = [
  'park',
  'food',
  'cafe',
  'culture',
  'sports',
  'shopping',
] as const
export type Category = (typeof categories)[number]
export const categoryNames: Record<Category, string> = {
  park: '자연·공원',
  food: '음식점',
  cafe: '카페',
  culture: '문화·공연',
  sports: '운동',
  shopping: '쇼핑',
}
export const companions = [
  '혼자',
  '아이와',
  '연인과',
  '친구와',
  '가족과',
] as const
export type Companion = (typeof companions)[number]
export type Coordinate = { lat: number; lng: number }
export type Source = {
  name: string
  url: string | null
  updatedAt: string
  isDemo: boolean
}
export type Place = ImageFields &
  CrowdingFields & {
    id: string
    name: string
    description: string
    category: Category
    district: string
    address: string
    location: Coordinate | null
    imageUrl: string | null
    price: number | null
    durationMinutes: number
    openingHours: string
    source: Source
  }
export type Event = Place & {
  startsAt: string
  endsAt: string
  venue: string
  participation: string
  companions: Companion[]
  notice: string | null
  environment: 'indoor' | 'outdoor' | null
  programs: {
    id: string
    name: string
    category: Category
    price: number | null
    durationMinutes: number
  }[]
  sources: Source[]
  conflicts: {
    field: string
    entries: { sourceName: string; value: string; url: string | null }[]
  }[]
  applicationUrl: string | null
}
export type Catalog = {
  events: Event[]
  places: Place[]
  updatedAt: string
  revision: string
}
export type Filters = {
  query: string
  categories: Category[]
  districts: string[]
  companions: Companion[]
  date: string
  until: string
  freeOnly: boolean
  environment: 'indoor' | 'outdoor' | ''
  maxDuration: number | null
}
export const emptyFilters: Filters = {
  query: '',
  categories: [],
  districts: [],
  companions: [],
  date: '',
  until: '',
  freeOnly: false,
  environment: '',
  maxDuration: null,
}
export type CourseSettings = {
  date: string
  companion: Companion
  childAge: number | null
  transport: '자가용' | '대중교통' | '도보'
  origin: string
  originLocation: Coordinate | null
  startTime: string
  endTime: string
  budget: number | null
  activities: string[]
}
export type CourseStop = {
  startTime?: string | null
  endTime?: string | null
  id: string
  kind: 'arrival' | 'program' | 'meal' | 'nearby' | 'return' | 'custom'
  title: string
  place: Place | null
  missingReason: string | null
  durationMinutes: number
  travelMinutes: number | null
}
export type Course = {
  notes?: string[]
  planned?: boolean
  id: string
  name: string
  eventId: string
  settings: CourseSettings
  stops: CourseStop[]
  createdAt: string
  isDemo: boolean
}
export type Preferences = {
  location: boolean
  push: boolean
  events: boolean
  courses: boolean
  marketing: boolean
}
export type User = { id: string; name: string; email: string }
