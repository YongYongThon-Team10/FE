import { categories, companions } from './models'
import type { Catalog, Coordinate, Course, Event, Place, User } from './models'

function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('데이터 형식이 올바르지 않습니다.')
}
function string(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length > 10000)
    throw new Error('문자열 데이터 형식을 확인해 주세요.')
}
function number(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error('숫자 데이터 범위를 확인해 주세요.')
}
function date(value: unknown): asserts value is string {
  string(value)
  if (!Number.isFinite(Date.parse(value)))
    throw new Error('날짜 데이터 형식을 확인해 주세요.')
}
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, window.location.origin)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
export function parseCoordinate(value: unknown): Coordinate {
  object(value)
  number(value.lat, -90, 90)
  number(value.lng, -180, 180)
  return { lat: value.lat, lng: value.lng }
}
export function parsePlace(value: unknown): Place {
  object(value)
  for (const key of [
    'id',
    'name',
    'description',
    'district',
    'address',
    'openingHours',
  ])
    string(value[key])
  if (!value.id || !value.name || !categories.includes(value.category as never))
    throw new Error('장소 식별자 또는 카테고리가 올바르지 않습니다.')
  if (value.location !== null) parseCoordinate(value.location)
  if (value.price !== null) number(value.price)
  number(value.durationMinutes, 1, 1440)
  if (value.imageUrl !== null) string(value.imageUrl)
  object(value.source)
  string(value.source.name)
  date(value.source.updatedAt)
  if (value.source.url !== null) string(value.source.url)
  if (typeof value.source.isDemo !== 'boolean')
    throw new Error('출처의 시연 여부가 필요합니다.')
  return value as unknown as Place
}
export function parseEvent(value: unknown): Event {
  parsePlace(value)
  object(value)
  date(value.startsAt)
  date(value.endsAt)
  if (Date.parse(value.endsAt) < Date.parse(value.startsAt))
    throw new Error('행사 종료일이 시작일보다 빠릅니다.')
  string(value.venue)
  string(value.participation)
  if (value.notice !== null) string(value.notice)
  if (
    !Array.isArray(value.companions) ||
    !value.companions.every((x) => companions.includes(x as never))
  )
    throw new Error('동행 데이터가 올바르지 않습니다.')
  if (![null, 'indoor', 'outdoor'].includes(value.environment as never))
    throw new Error('실내·야외 정보가 올바르지 않습니다.')
  if (value.applicationUrl !== null) string(value.applicationUrl)
  if (
    !Array.isArray(value.programs) ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.conflicts)
  )
    throw new Error('프로그램·출처·상이 항목 목록이 필요합니다.')
  for (const p of value.programs) {
    object(p)
    string(p.id)
    string(p.name)
    if (!categories.includes(p.category as never))
      throw new Error('프로그램 분류 오류')
    if (p.price !== null) number(p.price)
    number(p.durationMinutes, 1, 1440)
  }
  for (const s of value.sources) {
    object(s)
    string(s.name)
    date(s.updatedAt)
    if (s.url !== null) string(s.url)
    if (typeof s.isDemo !== 'boolean') throw new Error('출처 유형 오류')
  }
  for (const c of value.conflicts) {
    object(c)
    string(c.field)
    if (!Array.isArray(c.entries)) throw new Error('출처 차이 데이터 오류')
    for (const entry of c.entries) {
      object(entry)
      string(entry.sourceName)
      string(entry.value)
      if (entry.url !== null) string(entry.url)
    }
  }
  return value as unknown as Event
}
export function parseCatalog(value: unknown): Catalog {
  object(value)
  date(value.updatedAt)
  string(value.revision)
  if (!Array.isArray(value.events) || !Array.isArray(value.places))
    throw new Error('행사·장소 목록이 필요합니다.')
  const events = value.events.map(parseEvent)
  const places = value.places.map(parsePlace)
  if (
    new Set(events.map((x) => x.id)).size !== events.length ||
    new Set(places.map((x) => x.id)).size !== places.length
  )
    throw new Error('중복된 데이터 식별자가 있습니다.')
  return {
    events,
    places,
    updatedAt: value.updatedAt,
    revision: value.revision,
  }
}
export function parseCourse(value: unknown): Course {
  object(value)
  if (
    value.notes !== undefined &&
    (!Array.isArray(value.notes) ||
      value.notes.length > 100 ||
      !value.notes.every((n) => typeof n === 'string' && n.length <= 10000))
  )
    throw new Error('일정 안내를 확인해 주세요.')
  if (value.planned !== undefined && typeof value.planned !== 'boolean')
    throw new Error('일정 상태를 확인해 주세요.')
  string(value.id)
  string(value.name)
  string(value.eventId)
  date(value.createdAt)
  if (typeof value.isDemo !== 'boolean')
    throw new Error('코스 유형이 필요합니다.')
  object(value.settings)
  const s = value.settings
  string(s.date)
  string(s.origin)
  string(s.startTime)
  string(s.endTime)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
    !Number.isFinite(Date.parse(s.date)) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.endTime) ||
    s.startTime >= s.endTime
  )
    throw new Error('코스 날짜·시간이 올바르지 않습니다.')
  if (
    !companions.includes(s.companion as never) ||
    !['자가용', '대중교통', '도보'].includes(String(s.transport))
  )
    throw new Error('코스 조건이 올바르지 않습니다.')
  if (s.originLocation !== null) parseCoordinate(s.originLocation)
  if (s.budget !== null) number(s.budget)
  if (s.childAge !== null) number(s.childAge, 0, 18)
  if (
    !Array.isArray(s.activities) ||
    !s.activities.every((a) =>
      ['먹거리', '체험', '휴식', '공연'].includes(String(a)),
    )
  )
    throw new Error('활동 조건이 올바르지 않습니다.')
  if (
    !Array.isArray(value.stops) ||
    value.stops.length > 30 ||
    value.stops.length === 0
  )
    throw new Error('코스는 1~30개 장소로 구성해야 합니다.')
  for (const stop of value.stops) {
    object(stop)
    for (const field of ['startTime', 'endTime'])
      if (
        stop[field] !== undefined &&
        stop[field] !== null &&
        (typeof stop[field] !== 'string' ||
          !/^\d{2,3}:[0-5]\d$/.test(stop[field]))
      )
        throw new Error('일정 시간을 확인해 주세요.')
    string(stop.id)
    string(stop.title)
    if (
      !['arrival', 'program', 'meal', 'nearby', 'return', 'custom'].includes(
        String(stop.kind),
      )
    )
      throw new Error('일정 구분 오류')
    if (stop.place !== null) parsePlace(stop.place)
    if (stop.missingReason !== null) string(stop.missingReason)
    number(stop.durationMinutes, 0, 1440)
    if (stop.travelMinutes !== null) number(stop.travelMinutes, 0, 1440)
  }
  return value as unknown as Course
}
export function parseUser(value: unknown): User {
  object(value)
  string(value.id)
  string(value.name)
  string(value.email)
  return { id: value.id, name: value.name, email: value.email }
}
