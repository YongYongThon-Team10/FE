import { teamBackend } from './index'
import type { EventItem, EventQuery } from './contracts'
import { dateKey } from '@/domain/planning'

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
export async function searchEvents(text: string, signal: AbortSignal) {
  const query: EventQuery = { dateFrom: dateKey(), size: 100, page: 0 }
  let words = text
  if (
    /오늘|내일|모레|이번|다음|주말|무료|아이와|가족과|실내|야외|[월화수목금토일]요일|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}월/.test(
      text,
    )
  ) {
    const parsed = await teamBackend.parseSearch(text, dateKey(), signal)
    if (parsed?.parsed && parsed.conditions) {
      const c = parsed.conditions
      query.dateFrom = c.dateFrom ?? query.dateFrom
      if (c.dateTo) query.dateTo = c.dateTo
      if (c.district?.length) query.district = c.district
      if (c.dong?.length) query.dong = c.dong
      if (c.budget) query.budget = c.budget
      if (c.indoorOutdoor) query.indoorOutdoor = c.indoorOutdoor
      words = words.replace(
        /이번\s*주말|다음\s*주말|이번\s*주|다음\s*주|오늘|내일|모레|무료|아이와|가족과|실내|야외|[월화수목금토일]요일|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}월\s*\d{1,2}일/g,
        ' ',
      )
      for (const area of [...(c.district ?? []), ...(c.dong ?? [])])
        words = words.replaceAll(area, ' ')
    }
  }
  const first = await teamBackend.events(query, signal)
  if (
    !Array.isArray(first?.events) ||
    !Number.isInteger(first.totalCount) ||
    first.totalCount < 0
  )
    throw new Error('행사 검색 응답을 확인해 주세요.')
  const pages = Math.ceil(first.totalCount / 100)
  if (pages > 50)
    throw new Error('행사가 많아요. 날짜나 지역을 함께 입력해 주세요.')
  const events: EventItem[] = [...first.events]
  for (let page = 1; page < pages; page++) {
    const next = await teamBackend.events({ ...query, page }, signal)
    if (!Array.isArray(next?.events))
      throw new Error('행사 검색 응답을 확인해 주세요.')
    events.push(...next.events)
  }
  const terms = words
    .replace(/찾아줘|보여줘|추천해줘/g, ' ')
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean)
  const seen = new Set<string>()
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo ?? query.dateFrom,
    events: events.filter((e) => {
      if (typeof e?.eventId !== 'string' || typeof e.name !== 'string')
        throw new Error('행사 검색 응답을 확인해 주세요.')
      if (seen.has(e.eventId)) return false
      seen.add(e.eventId)
      const haystack = normalize(
        [
          e.name,
          e.category,
          e.subCategory,
          e.placeName,
          e.address,
          e.summary,
          ...(e.tags ?? []),
        ].join(' '),
      )
      return terms.every((term) => haystack.includes(term))
    }),
  }
}
