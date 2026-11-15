import type { CourseSettings } from '@/domain/models'
import type { ItineraryInput } from './contracts'

export function itineraryInput(
  eventId: string,
  settings: CourseSettings,
  originType: 'manual' | 'current' = 'manual',
): ItineraryInput {
  if (!/^YI-\d+$/.test(eventId))
    throw new Error(
      'BE 일정 생성에는 행사 ID가 필요해요. 카카오 장소는 아직 연결할 수 없어요.',
    )
  const origin = settings.originLocation
  if (
    !origin ||
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lng) ||
    Math.abs(origin.lat) > 90 ||
    Math.abs(origin.lng) > 180
  )
    throw new Error('출발지 검색 결과를 선택해 좌표를 확인해 주세요.')
  if (settings.budget !== null && settings.budget !== 0)
    throw new Error('BE는 현재 무료 또는 예산 제한 없음만 지원해요.')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(settings.date) ||
    !Number.isFinite(Date.parse(`${settings.date}T00:00:00+09:00`)) ||
    ![settings.startTime, settings.endTime].every((t) =>
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t),
    ) ||
    settings.startTime >= settings.endTime
  )
    throw new Error('방문 날짜와 시작 및 종료 시간을 확인해 주세요.')
  if (
    settings.companion === '아이와' &&
    (!Number.isInteger(settings.childAge) ||
      settings.childAge === null ||
      settings.childAge < 0)
  )
    throw new Error('아이 나이를 입력해 주세요.')
  const wants = {
    먹거리: 'food',
    체험: 'experience',
    휴식: 'rest',
    공연: 'performance',
  } as const
  if (settings.activities.some((activity) => !(activity in wants)))
    throw new Error('지원하지 않는 활동 조건이 있어요.')
  return {
    baseEventId: eventId,
    date: settings.date,
    companion: {
      혼자: 'alone',
      연인과: 'couple',
      친구와: 'friends',
      가족과: 'family',
      아이와: 'kids',
    }[settings.companion] as ItineraryInput['companion'],
    ...(settings.companion === '아이와' ? { kidsAge: settings.childAge! } : {}),
    origin: { type: originType, ...origin, address: settings.origin },
    transport: { 자가용: 'car', 대중교통: 'transit', 도보: 'walk' }[
      settings.transport
    ] as ItineraryInput['transport'],
    timeWindow: { start: settings.startTime, end: settings.endTime },
    budget: settings.budget === 0 ? 'free' : 'any',
    wants: settings.activities.map(
      (activity) => wants[activity as keyof typeof wants],
    ),
  }
}
