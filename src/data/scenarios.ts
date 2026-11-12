import type { Course, CourseSettings, User } from '@/domain/models'
import { demoCatalog } from './demo'
import { makeDemoCourse } from '@/domain/planning'
export const sampleUser: User = {
  id: 'design-demo-user',
  name: '코스 여행자',
  email: 'traveler@example.com',
}
export const calendarDemoEvents = [
  {
    ...demoCatalog.events[0],
    id: 'calendar-exhibition',
    name: '가을 야외전',
    startsAt: '2026-11-12T10:00:00+09:00',
    endsAt: '2026-11-15T18:00:00+09:00',
  },
  {
    ...demoCatalog.events[1],
    id: 'calendar-market',
    name: '주말 마켓',
    startsAt: '2026-11-14T10:00:00+09:00',
    endsAt: '2026-11-15T18:00:00+09:00',
  },
]
export const sampleSettings: CourseSettings = {
  date: '2026-11-14',
  companion: '아이와',
  childAge: 7,
  transport: '자가용',
  origin: '기흥역',
  originLocation: null,
  startTime: '10:00',
  endTime: '17:00',
  budget: null,
  activities: ['먹거리', '체험', '휴식'],
}
export function designCourse(): Course {
  const course = makeDemoCourse(
    demoCatalog.events[0],
    demoCatalog,
    sampleSettings,
  )
  return {
    ...course,
    id: 'design-course',
    name: '호수공원 중심 하루',
    createdAt: '2026-11-12T00:00:00+09:00',
    stops: course.stops.map((stop) => ({ ...stop, id: stop.kind })),
  }
}
