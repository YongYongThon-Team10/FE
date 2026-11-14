import type {
  EventDetail,
  SlotInput,
  Candidates,
  SharedItinerary,
  CalendarMonth,
  CalendarDate,
  CourseList,
  EventList,
  EventQuery,
  Itinerary,
  ItineraryInput,
  OriginPlace,
  ParsedSearch,
  SavedCourse,
  Tokens,
} from './contracts'

type JsonObject = Record<string, unknown>
const object = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
export class BackendError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'BackendError'
    this.status = status
    this.code = code
  }
}
const malformed = () =>
  new BackendError(502, 'INVALID_RESPONSE', '백엔드 응답 형식을 확인해 주세요.')
function tokens(value: unknown): Tokens {
  if (
    !object(value) ||
    !['accessToken', 'refreshToken', 'email', 'name'].every(
      (key) => typeof value[key] === 'string' && value[key] !== '',
    )
  )
    throw malformed()
  return value as Tokens
}
// Tokens stay in memory. Refreshing the page requires sign-in until BE session
// persistence is agreed. Never write either token to localStorage or a URL.
export function createTeamBackend({
  baseUrl,
  fetcher = fetch,
  timeoutMs = 20000,
}: {
  baseUrl: string
  fetcher?: typeof fetch
  timeoutMs?: number
}) {
  const base = baseUrl.trim().replace(/\/$/, '')
  if (base) {
    const url = new URL(base)
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      !(
        url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      )
    )
      throw new Error(
        'BE 주소는 API 경로를 제외한 HTTPS 서버 주소를 입력하세요.',
      )
  }
  let session: Tokens | null = null
  let revision = 0
  let refreshing: Promise<void> | null = null
  const clearSession = () => {
    session = null
    revision++
  }
  async function send(
    path: string,
    { signal, ...init }: RequestInit = {},
    authenticated = false,
    timeout = timeoutMs,
  ): Promise<unknown> {
    if (!base)
      throw new BackendError(
        0,
        'NOT_CONFIGURED',
        '백엔드 운영 주소가 필요해요.',
      )
    if (authenticated && !session)
      throw new BackendError(401, 'SIGN_IN_REQUIRED', '로그인이 필요해요.')
    const controller = new AbortController()
    const abort = () => controller.abort(signal?.reason)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const headers = new Headers(init.headers)
      headers.set('Accept', 'application/json')
      if (init.body) headers.set('Content-Type', 'application/json')
      if (session) headers.set('Authorization', `Bearer ${session.accessToken}`)
      const response = await fetcher(`${base}${path}`, {
        ...init,
        headers,
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      })
      const value: unknown = await response.json().catch(() => null)
      const error = object(value) && object(value.error) ? value.error : null
      if (!response.ok || (error && error.code != null))
        throw new BackendError(
          response.status,
          typeof error?.code === 'string' ? error.code : 'HTTP_ERROR',
          response.status >= 500
            ? '백엔드 연결에 실패했어요. 잠시 후 다시 시도해 주세요.'
            : response.status === 404
              ? '요청한 정보를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.'
              : response.status === 429
                ? '요청이 많아요. 잠시 후 다시 시도해 주세요.'
                : typeof error?.message === 'string'
                  ? error.message
                  : response.status === 401
                    ? '로그인이 필요해요.'
                    : `요청을 완료하지 못했어요. (${response.status})`,
        )
      if (!object(value) || !('data' in value) || !error || !('code' in error))
        throw malformed()
      return value.data
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error
      if (controller.signal.aborted)
        throw new BackendError(0, 'TIMEOUT', '연결 시간이 초과됐어요.')
      if (error instanceof TypeError)
        throw new BackendError(
          0,
          'NETWORK_ERROR',
          '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
        )
      throw error
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }
  async function refresh() {
    if (!refreshing) {
      const version = revision
      const refreshToken = session?.refreshToken
      if (!refreshToken)
        throw new BackendError(401, 'SIGN_IN_REQUIRED', '다시 로그인해 주세요.')
      refreshing = send('/api/v1/auth/reissue', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
        .then((value) => {
          const next = tokens(value)
          if (version !== revision)
            throw new BackendError(
              401,
              'SESSION_CHANGED',
              '다시 로그인해 주세요.',
            )
          session = next
        })
        .catch((error) => {
          if (version === revision) clearSession()
          throw error
        })
        .finally(() => {
          refreshing = null
        })
    }
    await refreshing
  }
  async function call<T>(
    path: string,
    init: RequestInit = {},
    authenticated = false,
    timeout?: number,
  ): Promise<T> {
    const before = session?.accessToken
    const version = revision
    try {
      return (await send(path, init, authenticated, timeout)) as T
    } catch (error) {
      if (
        !(error instanceof BackendError) ||
        error.status !== 401 ||
        !authenticated ||
        !session
      )
        throw error
      if (version !== revision)
        throw new BackendError(401, 'SESSION_CHANGED', '다시 로그인해 주세요.')
      if (session.accessToken === before) await refresh()
      try {
        return (await send(path, init, authenticated, timeout)) as T
      } catch (retryError) {
        if (retryError instanceof BackendError && retryError.status === 401)
          clearSession()
        throw retryError
      }
    }
  }
  const json = (body: unknown, signal?: AbortSignal): RequestInit => ({
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  })
  const id = (value: string) => encodeURIComponent(value)
  const itinerary = (value: string) => `/api/itineraries/${id(value)}`
  async function signIn(path: string, body: unknown) {
    clearSession()
    const version = revision
    const next = tokens(await send(path, json(body)))
    if (version !== revision)
      throw new BackendError(
        401,
        'SESSION_CHANGED',
        '로그인을 다시 시도해 주세요.',
      )
    session = next
    return { email: next.email, name: next.name }
  }
  return {
    enabled: Boolean(base),
    identity: () => session && { email: session.email, name: session.name },
    clearSession,
    signIn: (email: string, password: string) =>
      signIn('/api/v1/auth/signin', { email, password }),
    signUp: (email: string, password: string, name: string) =>
      signIn('/api/v1/auth/signup', { email, password, name }),
    logout: async () => {
      try {
        await call<null>('/api/v1/auth/logout', { method: 'POST' }, true)
      } finally {
        clearSession()
      }
    },
    events: (query: EventQuery, signal?: AbortSignal) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query))
        if (value !== undefined && (!Array.isArray(value) || value.length))
          params.set(
            key,
            Array.isArray(value) ? value.join(',') : String(value),
          )
      return call<EventList>(`/api/events?${params}`, { signal })
    },
    event: (eventId: string, signal?: AbortSignal) =>
      call<EventDetail>(`/api/events/${id(eventId)}`, { signal }),
    discrepancies: (eventId: string, signal?: AbortSignal) =>
      call<{ eventId: string; hasDiscrepancy: boolean; items: unknown[] }>(
        `/api/events/${id(eventId)}/discrepancies`,
        { signal },
      ),
    addSlot: (itineraryId: string, input: SlotInput) =>
      call<Itinerary>(`${itinerary(itineraryId)}/slots`, json(input)),
    deleteSlot: (itineraryId: string, slotId: string) =>
      call<Itinerary>(`${itinerary(itineraryId)}/slots/${id(slotId)}`, {
        method: 'DELETE',
      }),
    replaceSlot: (
      itineraryId: string,
      slotId: string,
      replacement:
        | { replaceWithCandidateId: string; replaceWithEventId?: never }
        | { replaceWithEventId: string; replaceWithCandidateId?: never },
    ) =>
      call<Itinerary>(`${itinerary(itineraryId)}/slots/${id(slotId)}`, {
        ...json(replacement),
        method: 'PUT',
      }),
    alternatives: (
      itineraryId: string,
      slotId: string,
      limit = 3,
      signal?: AbortSignal,
    ) =>
      call<Candidates>(
        `${itinerary(itineraryId)}/slots/${id(slotId)}/alternatives?limit=${limit}`,
        { signal },
      ),
    mealCandidates: (
      itineraryId: string,
      slotId: string,
      limit = 3,
      signal?: AbortSignal,
    ) =>
      call<Candidates>(
        `${itinerary(itineraryId)}/slots/${id(slotId)}/meal-candidates?limit=${limit}`,
        { signal },
      ),
    shared: (shareId: string, signal?: AbortSignal) =>
      call<SharedItinerary>(`/api/shared/${id(shareId)}`, { signal }),
    calendarMonth: (month: string, signal?: AbortSignal) =>
      call<CalendarMonth>(
        `/api/me/calendar?${new URLSearchParams({ month })}`,
        { signal },
      ),
    calendarDate: (date: string, signal?: AbortSignal) =>
      call<CalendarDate>(`/api/me/calendar?${new URLSearchParams({ date })}`, {
        signal,
      }),
    parseSearch: (query: string, today: string, signal?: AbortSignal) =>
      call<ParsedSearch>('/api/search/parse', json({ query, today }, signal)),
    originPlaces: (query: string, signal?: AbortSignal) =>
      call<{ places: OriginPlace[] }>(
        `/api/places/search?${new URLSearchParams({ query })}`,
        { signal },
      ),
    favorite: (eventId: string, favorited: boolean) =>
      call<{ eventId: string; favorited: boolean }>(
        `/api/me/favorites/${id(eventId)}`,
        { method: favorited ? 'PUT' : 'DELETE' },
        true,
      ),
    createItinerary: (input: ItineraryInput, signal?: AbortSignal) =>
      call<Itinerary>('/api/itineraries', json(input, signal), false, 65000),
    itinerary: (itineraryId: string, signal?: AbortSignal) =>
      call<Itinerary>(itinerary(itineraryId), { signal }),
    regenerate: (itineraryId: string, input: Partial<ItineraryInput>) =>
      call<Itinerary>(
        `${itinerary(itineraryId)}/regenerate`,
        json(input),
        false,
        65000,
      ),
    reorder: (itineraryId: string, slotIds: string[]) =>
      call<Itinerary>(`${itinerary(itineraryId)}/slots/order`, {
        ...json({ slotIds }),
        method: 'PATCH',
      }),
    // BE currently uses a shared demo owner. Do not bind these to personal saves.
    saveDemoCourse: (itineraryId: string, title?: string) =>
      call<SavedCourse>('/api/me/courses', json({ itineraryId, title })),
    demoCourses: (page = 0, size = 20) =>
      call<CourseList>(
        `/api/me/courses?${new URLSearchParams({ page: String(page), size: String(size) })}`,
      ),
    deleteDemoCourse: (courseId: string) =>
      call<{ courseId: string; deleted: boolean }>(
        `/api/me/courses/${id(courseId)}`,
        { method: 'DELETE' },
      ),
    share: (itineraryId: string) =>
      call<{ shareId: string; shareUrl: string; title: string }>(
        `${itinerary(itineraryId)}/share`,
        { method: 'POST' },
      ),
  }
}
