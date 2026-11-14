import { emptyFilters } from '@/domain/models'
import type { Filters } from '@/domain/models'
import { dateKey, weekDates } from '@/domain/planning'
import { isDemo, request } from './api'

export async function interpretSearch(
  text: string,
  signal?: AbortSignal,
): Promise<Filters> {
  if (!isDemo) {
    const value = await request('/search/interpret', {
      signal,
      method: 'POST',
      body: JSON.stringify({
        text,
        timezone: 'Asia/Seoul',
        referenceDate: dateKey(),
      }),
    })
    return parseFilters(value)
  }
  // Explicit keyword preview for offline development; this is not an AI response.
  const filters: Filters = {
    ...emptyFilters,
    categories: [],
    districts: [],
    companions: [],
  }
  const days = weekDates(dateKey())
  if (/이번\s*주말/.test(text)) {
    filters.date = days[6]
    const sun = new Date(`${days[6]}T12:00:00+09:00`)
    sun.setUTCDate(sun.getUTCDate() + 1)
    filters.until = dateKey(sun)
  } else if (/오늘/.test(text)) filters.date = dateKey()
  else if (/내일/.test(text)) {
    const d = new Date(`${dateKey()}T12:00:00+09:00`)
    d.setUTCDate(d.getUTCDate() + 1)
    filters.date = dateKey(d)
  }
  filters.districts = ['처인구', '수지구', '기흥구'].filter((d) =>
    text.includes(d),
  )
  if (/아이|가족/.test(text))
    filters.companions = [text.includes('가족') ? '가족과' : '아이와']
  else if (/연인|커플/.test(text)) filters.companions = ['연인과']
  else if (/친구/.test(text)) filters.companions = ['친구와']
  else if (/혼자/.test(text)) filters.companions = ['혼자']
  filters.freeOnly = /무료/.test(text)
  if (/실내/.test(text)) filters.environment = 'indoor'
  else if (/야외|실외/.test(text)) filters.environment = 'outdoor'
  const hours = text.match(/(\d+)\s*시간/)
  if (hours) filters.maxDuration = Math.min(1440, Number(hours[1]) * 60)
  // Keep event/place words when the same sentence also contains conditions.
  filters.query = text
    .replace(
      /이번\s*주말|오늘|내일|처인구|수지구|기흥구|무료|실내|야외|실외|\d+\s*시간/g,
      ' ',
    )
    .replace(/(?:아이|가족|연인|커플|친구)(?:와|과|랑)?|혼자/g, ' ')
    .replace(/(?:갈\s*곳|가고\s*싶어요|찾아\s*주세요|추천해\s*주세요)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return filters
}
export function parseFilters(value: unknown): Filters {
  if (!value || typeof value !== 'object')
    throw new Error('검색 조건을 이해하지 못했어요.')
  const f = value as Record<string, unknown>
  const stringList = (v: unknown, allowed: readonly string[]) =>
    Array.isArray(v) &&
    v.every((x) => typeof x === 'string' && allowed.includes(x))
  if (
    typeof f.query !== 'string' ||
    !stringList(f.categories, [
      'park',
      'food',
      'cafe',
      'culture',
      'sports',
      'shopping',
    ]) ||
    !stringList(f.districts, ['처인구', '수지구', '기흥구']) ||
    !stringList(f.companions, [
      '혼자',
      '아이와',
      '연인과',
      '친구와',
      '가족과',
    ]) ||
    typeof f.date !== 'string' ||
    typeof f.until !== 'string' ||
    !['', 'indoor', 'outdoor'].includes(String(f.environment)) ||
    typeof f.freeOnly !== 'boolean' ||
    (f.maxDuration !== null &&
      (typeof f.maxDuration !== 'number' ||
        !Number.isFinite(f.maxDuration) ||
        f.maxDuration <= 0 ||
        f.maxDuration > 1440))
  )
    throw new Error(
      '검색 조건 형식이 올바르지 않아요. 칩으로 직접 선택해 주세요.',
    )
  for (const d of [f.date, f.until])
    if (
      d &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)))
    )
      throw new Error('검색 날짜 형식을 확인해 주세요.')
  if (f.until && (!f.date || f.until < f.date))
    throw new Error('검색 날짜 범위를 확인해 주세요.')
  return f as unknown as Filters
}
