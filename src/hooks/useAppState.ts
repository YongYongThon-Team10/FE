import { useEffect, useRef, useState } from 'react'
import type {
  Coordinate,
  Course,
  Filters,
  Preferences,
  User,
} from '@/domain/models'
import { emptyFilters } from '@/domain/models'
import { parseCourse } from '@/domain/validation'
import { courseSnapshot } from '@/domain/snapshots'
import { useCatalog } from '@/hooks/useCatalog'
import { useStorage } from '@/hooks/useStorage'
import { api, isDemo } from '@/services/api'

function validateCourses(value: unknown): Course[] {
  if (!Array.isArray(value)) throw new Error()
  return value.map(parseCourse)
}
function validatePreferences(value: unknown): Preferences {
  if (
    !value ||
    typeof value !== 'object' ||
    !['location', 'push', 'events', 'courses', 'marketing'].every(
      (k) => typeof (value as Record<string, unknown>)[k] === 'boolean',
    )
  )
    throw new Error()
  return value as Preferences
}
function validateFavorites(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string'))
    throw new Error()
  return value
}
const defaults: Preferences = {
  location: true,
  push: false,
  events: true,
  courses: true,
  marketing: false,
}

export function useAppState() {
  const catalog = useCatalog()
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [courses, setCourses, courseStorageError] = useStorage<Course[]>(
    'yongin.courses.v1',
    [],
    validateCourses,
    (value) => value.map((c) => courseSnapshot(c)),
  )
  const [draft, setDraft, draftStorageError] = useStorage<Course | null>(
    'yongin.draft.v1',
    null,
    (v) => (v === null ? null : parseCourse(v)),
    (value) => (value === null ? null : courseSnapshot(value)),
  )
  const [preferences, storePreferences, preferenceStorageError] = useStorage(
    'yongin.preferences.v1',
    defaults,
    validatePreferences,
  )
  const [favorites, setFavorites, favoriteStorageError] = useStorage<string[]>(
    'yongin.favorites.v1',
    [],
    validateFavorites,
  )
  const [user, setUser] = useState<User | null>(null)
  const [location, setLocation] = useState<Coordinate | null>(null)
  const locationEnabled = useRef(preferences.location)
  const setPreferences = (next: Preferences) => {
    locationEnabled.current = next.location
    if (!next.location) setLocation(null)
    return storePreferences(next)
  }
  const [locationError, setLocationError] = useState('')
  const [locating, setLocating] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => {
    if (!isDemo)
      void api
        .session()
        .then(setUser)
        .catch(() => setUser(null))
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])
  const locate = (): Promise<Coordinate> =>
    new Promise((resolve, reject) => {
      if (!preferences.location) {
        const error = new Error(
          '개인정보 관리에서 위치 정보 이용을 켜거나 출발지를 직접 입력해 주세요.',
        )
        setLocationError(error.message)
        reject(error)
        return
      }
      if (!navigator.geolocation) {
        const error = new Error(
          '이 브라우저에서 위치 정보를 사용할 수 없어요. 출발지를 직접 입력해 주세요.',
        )
        setLocationError(error.message)
        reject(error)
        return
      }
      setLocating(true)
      setLocationError('')
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!locationEnabled.current) {
            setLocating(false)
            reject(
              new Error(
                '위치 정보 이용을 껐어요. 출발지를 직접 입력해 주세요.',
              ),
            )
            return
          }
          const coordinate = { lat: p.coords.latitude, lng: p.coords.longitude }
          setLocation(coordinate)
          setLocating(false)
          resolve(coordinate)
        },
        (e) => {
          const error = new Error(
            e.code === 1
              ? '위치 권한이 거부됐어요. 출발지를 직접 입력해 주세요.'
              : '위치를 확인할 수 없어요. 출발지를 직접 입력해 주세요.',
          )
          setLocationError(error.message)
          setLocating(false)
          reject(error)
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
      )
    })
  const storeDraft = (course: Course) => {
    setDraft(course)
  }
  const saveCourse = (course: Course) => {
    const clean = courseSnapshot(course)
    const ok = setCourses([clean, ...courses.filter((c) => c.id !== clean.id)])
    if (ok) setToast('이 브라우저에 코스를 저장했어요.')
    return ok
  }
  const favorite = (id: string) =>
    setFavorites(
      favorites.includes(id)
        ? favorites.filter((v) => v !== id)
        : [...favorites, id],
    )
  return {
    ...catalog,
    filters,
    setFilters,
    courses,
    setCourses,
    draft,
    storeDraft,
    saveCourse,
    preferences,
    setPreferences,
    favorites,
    favorite,
    user,
    setUser,
    location,
    locate,
    locationError,
    locating,
    toast,
    setToast,
    storageError:
      courseStorageError ||
      draftStorageError ||
      preferenceStorageError ||
      favoriteStorageError,
  }
}
