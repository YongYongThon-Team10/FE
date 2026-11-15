import type { Place } from './models'
import { parsePlace } from './validation'
export type Facility = Place & {
  group: string
  type: string
  town: string
  holiday: string
  occupancy: {
    current: number
    capacity: number
    observedAt: string
    updatedAt: string
  } | null
  parking: {
    name: string
    type: string
    available: number | null
    total: number | null
    observedAt: string | null
  } | null
  eventIds: string[]
  schematicPosition: [number, number] | null
}
export type FacilityEvent = {
  id: string
  name: string
  facilityId: string
  schedule: string
}
export type FacilityCatalog = {
  items: Facility[]
  events: FacilityEvent[]
  updatedAt: string
  revision: string
}
export function occupancyStatus(f: Facility) {
  if (!f.occupancy) return '정보 없음'
  const ratio = f.occupancy.current / f.occupancy.capacity
  return ratio < 0.5 ? '여유' : ratio < 0.8 ? '보통' : '혼잡'
}
export function parseFacilityCatalog(value: unknown): FacilityCatalog {
  if (!value || typeof value !== 'object')
    throw new Error('시설 응답 형식을 확인해 주세요.')
  const c = value as Record<string, unknown>
  if (
    !Array.isArray(c.items) ||
    !Array.isArray(c.events) ||
    typeof c.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(c.updatedAt)) ||
    typeof c.revision !== 'string'
  )
    throw new Error('시설 목록 형식을 확인해 주세요.')
  for (const item of c.items) {
    parsePlace(item)
    if (
      !['group', 'type', 'town', 'holiday'].every(
        (k) => typeof item[k] === 'string',
      ) ||
      !Array.isArray(item.eventIds) ||
      !item.eventIds.every((v: unknown) => typeof v === 'string')
    )
      throw new Error('시설 상세 형식을 확인해 주세요.')
    if (item.occupancy !== null) {
      const o = item.occupancy
      if (
        !o ||
        !Number.isInteger(o.current) ||
        o.current < 0 ||
        !Number.isInteger(o.capacity) ||
        o.capacity <= 0 ||
        !Number.isFinite(Date.parse(o.observedAt)) ||
        !Number.isFinite(Date.parse(o.updatedAt))
      )
        throw new Error('이용 현황 형식을 확인해 주세요.')
    }
    if (item.parking !== null) {
      const p = item.parking
      if (
        !p ||
        typeof p.name !== 'string' ||
        typeof p.type !== 'string' ||
        [p.available, p.total].some(
          (v) => v !== null && (!Number.isInteger(v) || v < 0),
        ) ||
        (p.observedAt !== null && !Number.isFinite(Date.parse(p.observedAt)))
      )
        throw new Error('주차 정보 형식을 확인해 주세요.')
    }
  }
  if (
    !c.events.every(
      (e) =>
        e &&
        ['id', 'name', 'facilityId', 'schedule'].every(
          (k) => typeof e[k] === 'string',
        ),
    ) ||
    new Set(c.items.map((i) => i.id)).size !== c.items.length
  )
    throw new Error('시설 식별자·행사 형식을 확인해 주세요.')
  return c as unknown as FacilityCatalog
}
