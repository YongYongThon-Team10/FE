import type {
  Catalog,
  Coordinate,
  Course,
  CourseSettings,
  CourseStop,
  Event,
  Filters,
  Place,
} from './models'

export function dateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(
    date,
  )
}
export function weekDates(anchor: string, offset = 0): string[] {
  const d = new Date(`${anchor}T12:00:00+09:00`)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(d)
  d.setUTCDate(
    d.getUTCDate() -
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday) +
      offset * 7,
  )
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setUTCDate(day.getUTCDate() + i)
    return dateKey(day)
  })
}
export function filterEvents(events: Event[], filters: Filters): Event[] {
  const words = filters.query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  return events.filter(
    (e) =>
      words.every((w) =>
        `${e.name} ${e.description} ${e.venue} ${e.district}`
          .toLocaleLowerCase()
          .includes(w),
      ) &&
      (!filters.categories.length || filters.categories.includes(e.category)) &&
      (!filters.districts.length || filters.districts.includes(e.district)) &&
      (!filters.companions.length ||
        filters.companions.some((c) => e.companions.includes(c))) &&
      (!filters.date ||
        (dateKey(new Date(e.startsAt)) <= (filters.until || filters.date) &&
          dateKey(new Date(e.endsAt)) >= filters.date)) &&
      (!filters.freeOnly || e.price === 0) &&
      (!filters.environment || e.environment === filters.environment) &&
      (!filters.maxDuration || e.durationMinutes <= filters.maxDuration),
  )
}
export function priceText(price: number | null): string {
  return price === null
    ? '요금 정보 없음'
    : price === 0
      ? '무료'
      : `${price.toLocaleString('ko-KR')}원`
}
export function eventDate(event: Event): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(event.startsAt))
}
export function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
export function clock(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
export function schedule(course: Course) {
  let cursor = minutes(course.settings.startTime)
  return course.stops.map((stop) => {
    cursor += stop.travelMinutes ?? 0
    if (stop.startTime) cursor = minutes(stop.startTime)
    const start = cursor
    cursor += stop.durationMinutes
    if (stop.endTime) cursor = minutes(stop.endTime)
    return {
      ...stop,
      start:
        stop.startTime === undefined
          ? clock(start)
          : (stop.startTime ?? '시간 미정'),
      end:
        stop.endTime === undefined
          ? clock(cursor)
          : (stop.endTime ?? '시간 미정'),
      overflows: cursor > minutes(course.settings.endTime),
    }
  })
}
export function distanceKm(a: Coordinate, b: Coordinate): number {
  const r = Math.PI / 180
  const lat = (b.lat - a.lat) * r
  const lng = (b.lng - a.lng) * r
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(lng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)))
}
export function recalculate(course: Course): Course {
  let previous = course.settings.originLocation
  const speed = { 자가용: 25, 대중교통: 15, 도보: 4 }[course.settings.transport]
  return {
    ...course,
    stops: course.stops.map((stop) => {
      const location =
        stop.kind === 'return'
          ? course.settings.originLocation
          : stop.place?.location
      const travelMinutes =
        previous && location
          ? Math.ceil((distanceKm(previous, location) / speed) * 60)
          : null
      // A stop without coordinates breaks the chain; do not estimate across it.
      if (stop.place || stop.kind === 'return') previous = location ?? null
      return {
        ...stop,
        startTime: undefined,
        endTime: undefined,
        travelMinutes,
      }
    }),
  }
}
export function makeDemoCourse(
  event: Event,
  catalog: Catalog,
  settings: CourseSettings,
): Course {
  if (
    dateKey(new Date(event.startsAt)) > settings.date ||
    dateKey(new Date(event.endsAt)) < settings.date
  )
    throw new Error('선택한 날짜에 진행되는 행사가 아니에요.')
  const eligible = (p: Place) => settings.budget !== 0 || p.price === 0
  if (!eligible(event))
    throw new Error('무료만 조건으로 선택한 유료 행사를 방문할 수 없어요.')
  const desired = new Set(
    settings.activities.flatMap(
      (a) =>
        ({
          먹거리: ['food'],
          체험: ['culture', 'park'],
          휴식: ['park', 'cafe'],
          공연: ['culture'],
        })[a] ?? [],
    ),
  )
  const matchesActivity = (p: Pick<Place, 'category'>) =>
    !desired.size || desired.has(p.category)
  const program = event.programs.find(
    (p) => (settings.budget !== 0 || p.price === 0) && matchesActivity(p),
  )
  const meal = settings.activities.includes('먹거리')
    ? catalog.places.find(
        (p) =>
          p.category === 'food' && p.district === event.district && eligible(p),
      )
    : undefined
  const nearby = catalog.events.find(
    (e) =>
      e.id !== event.id &&
      eligible(e) &&
      matchesActivity(e) &&
      e.location &&
      event.location &&
      distanceKm(event.location, e.location) < 10 &&
      dateKey(new Date(e.startsAt)) <= settings.date &&
      dateKey(new Date(e.endsAt)) >= settings.date,
  )
  const stop = (
    kind: CourseStop['kind'],
    title: string,
    p: Place | null,
    reason: string | null,
    durationMinutes = p?.durationMinutes ?? 0,
  ): CourseStop => ({
    id: crypto.randomUUID(),
    kind,
    title,
    place: p,
    missingReason: reason,
    durationMinutes,
    travelMinutes: null,
  })
  const stops = [
    stop('arrival', event.name, event, null),
    stop(
      'program',
      program?.name ?? '프로그램 참여',
      program
        ? {
            ...event,
            id: program.id,
            name: program.name,
            category: program.category,
            price: program.price,
          }
        : null,
      program ? null : '조건에 맞는 프로그램 정보가 없어요.',
      program?.durationMinutes ?? 0,
    ),
    stop(
      'meal',
      meal?.name ?? '식사 장소',
      meal ?? null,
      meal
        ? null
        : settings.activities.includes('먹거리')
          ? '확인된 식사 후보가 없어요. 직접 추가해 주세요.'
          : '먹거리 활동을 선택하지 않았어요.',
    ),
    stop(
      'nearby',
      nearby?.name ?? '근처 다른 행사',
      nearby ?? null,
      nearby ? null : '같은 날 가까운 행사 후보가 없어요.',
    ),
    stop(
      'return',
      '귀가',
      null,
      settings.originLocation
        ? null
        : '출발지 좌표 확인 후 귀가 동선을 표시할 수 있어요.',
    ),
  ]
  const course = recalculate({
    id: crypto.randomUUID(),
    name: `${event.district}에서 보내는 우리만의 하루`,
    eventId: event.id,
    settings,
    stops,
    createdAt: new Date().toISOString(),
    isDemo: true,
  })
  // Preserve five slots. Leave unavailable/out-of-window candidates empty rather than inventing them.
  let used = minutes(settings.startTime)
  const end = minutes(settings.endTime)
  course.stops = course.stops.map((s) => {
    const next = used + (s.travelMinutes ?? 0) + s.durationMinutes
    if (next > end && s.kind !== 'return')
      return {
        ...s,
        place: null,
        durationMinutes: 0,
        travelMinutes: null,
        missingReason:
          '선택한 시간 안에 방문하기 어려워요. 시간 조건을 늘려 주세요.',
      }
    used = next
    return s
  })
  return recalculate(course)
}
