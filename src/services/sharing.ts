import type { Course } from '@/domain/models'
import { courseSnapshot } from '@/domain/snapshots'
export function shareUrl(course: Course): string {
  const bytes = new TextEncoder().encode(
    JSON.stringify(courseSnapshot(course, true)),
  )
  const encoded = btoa(
    Array.from(bytes, (b) => String.fromCharCode(b)).join(''),
  )
  if (encoded.length > 24000)
    throw new Error('공유할 일정이 너무 길어요. 항목을 줄여 주세요.')
  return `${window.location.origin}${window.location.pathname}#/shared?data=${encodeURIComponent(encoded)}`
}
