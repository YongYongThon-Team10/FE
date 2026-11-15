import type { Course } from './models'
export type DayWindow = Pick<
  Course['settings'],
  'date' | 'startTime' | 'endTime'
>
export const durationText = (value: number) => {
  const amount = Math.max(0, Math.round(value))
  return (
    [
      amount >= 60 ? `${Math.floor(amount / 60)}시간` : '',
      amount % 60 ? `${amount % 60}분` : '',
    ]
      .filter(Boolean)
      .join(' ') || '0분'
  )
}
export function dayWindowError(value: DayWindow) {
  const date = new Date(`${value.date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value.date
  )
    return '방문 날짜를 확인해 주세요.'
  if (
    ![value.startTime, value.endTime].every((time) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    )
  )
    return '시작 시간과 종료 시간을 입력해 주세요.'
  return value.startTime >= value.endTime
    ? '종료 시간은 시작 시간보다 늦게 선택해 주세요.'
    : ''
}
