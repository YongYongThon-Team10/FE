import {
  parseCatalog,
  parseCoordinate,
  parseCourse,
  parseUser,
} from '@/domain/validation'
import type { Course, CourseSettings } from '@/domain/models'

export const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/$/, '')
export const isDemo = !apiBase
const refresh = Number(import.meta.env.VITE_DATA_REFRESH_MS ?? 60000)
export const refreshMs = Number.isFinite(refresh)
  ? Math.max(15000, refresh)
  : 60000
export async function request(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  if (!apiBase)
    throw new Error(
      '서비스 연결 준비 중이에요. 지금은 게스트로 둘러볼 수 있어요.',
    )
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(abort, 15000)
  try {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
    })
    if (!res.ok)
      throw new Error(
        res.status === 401
          ? '로그인이 필요해요.'
          : res.status === 429
            ? '요청이 많아요. 잠시 후 다시 시도해 주세요.'
            : `요청을 완료하지 못했어요. (${res.status})`,
      )
    if (res.status === 204) return null
    return await res.json()
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted)
      throw new Error('연결 시간이 초과됐어요. 다시 시도해 주세요.')
    throw error
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}
export const api = {
  catalog: async (signal?: AbortSignal) =>
    parseCatalog(await request('/catalog', { signal, cache: 'no-store' })),
  generateCourse: async (eventId: string, settings: CourseSettings) =>
    parseCourse(
      await request('/courses/generate', {
        method: 'POST',
        body: JSON.stringify({ eventId, settings }),
      }),
    ),
  recalculateCourse: async (course: Course) =>
    parseCourse(
      await request('/courses/recalculate', {
        method: 'POST',
        body: JSON.stringify({ course }),
      }),
    ),
  geocode: async (address: string) =>
    parseCoordinate(
      await request('/places/geocode', {
        method: 'POST',
        body: JSON.stringify({ address }),
      }),
    ),
  login: async (email: string, password: string) =>
    parseUser(
      await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    ),
  session: async () => {
    const user = await request('/auth/session')
    return user === null ? null : parseUser(user)
  },
  logout: () => request('/auth/logout', { method: 'POST' }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),
  register: (email: string, password: string, name: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  resetPassword: (email: string) =>
    request('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  inquiry: (email: string, title: string, message: string) =>
    request('/inquiries', {
      method: 'POST',
      body: JSON.stringify({ email, title, message }),
    }),
}
