import { test, expect } from '@playwright/test'
import {
  BackendError,
  createTeamBackend,
} from '../src/services/teamBackend/client'
import { itineraryInput } from '../src/services/teamBackend/adapters'
import type { CourseSettings } from '../src/domain/models'

const ok = (data: unknown) =>
  Response.json({ data, error: { code: null, message: null } })
const token = (suffix = '1') => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  email: 'qa@example.com',
  name: '검증 사용자',
})
const unauthorized = () =>
  Response.json(
    { data: null, error: { code: 'C4011', message: '인증이 필요합니다.' } },
    { status: 401 },
  )
const baseUrl = 'https://backend.example.com'

test('BE 로그인 규격과 메모리 인증, 토큰 없는 호출 및 로그아웃', async () => {
  const calls: { path: string; init?: RequestInit }[] = []
  const client = createTeamBackend({
    baseUrl,
    fetcher: async (url, init) => {
      const path = new URL(String(url)).pathname
      calls.push({ path, init })
      return path.endsWith('/signin') ? ok(token()) : ok(null)
    },
  })
  await expect(client.favorite('YI-0001', true)).rejects.toMatchObject({
    code: 'SIGN_IN_REQUIRED',
  })
  expect(calls).toHaveLength(0)
  await expect(
    client.signIn('qa@example.com', 'test-password'),
  ).resolves.toEqual({ email: 'qa@example.com', name: '검증 사용자' })
  expect(calls[0].path).toBe('/api/v1/auth/signin')
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({
    email: 'qa@example.com',
    password: 'test-password',
  })
  expect(client.identity()).not.toHaveProperty('accessToken')
  await client.logout()
  expect(calls[1].path).toBe('/api/v1/auth/logout')
  expect(new Headers(calls[1].init?.headers).get('Authorization')).toBe(
    'Bearer access-1',
  )
  expect(calls[1].init?.credentials).toBe('omit')
  expect(client.identity()).toBeNull()
})

test('동시 401은 한 번 재발급하고 새 토큰으로 각각 한 번 재시도', async () => {
  let reissues = 0
  let favorites = 0
  const client = createTeamBackend({
    baseUrl,
    fetcher: async (url, init) => {
      const path = new URL(String(url)).pathname
      if (path.endsWith('/signin')) return ok(token())
      if (path.endsWith('/reissue')) {
        reissues++
        expect(JSON.parse(String(init?.body))).toEqual({
          refreshToken: 'refresh-1',
        })
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ok(token('2'))
      }
      favorites++
      return new Headers(init?.headers).get('Authorization') ===
        'Bearer access-1'
        ? unauthorized()
        : ok({ eventId: 'YI-0001', favorited: true })
    },
  })
  await client.signIn('qa@example.com', 'password')
  await Promise.all([
    client.favorite('YI-0001', true),
    client.favorite('YI-0002', true),
  ])
  expect(reissues).toBe(1)
  expect(favorites).toBe(4)
})

test('재발급 실패 시 세션 해제, 인증 실패를 무한 재시도하지 않음', async () => {
  let calls = 0
  const client = createTeamBackend({
    baseUrl,
    fetcher: async (url) => {
      calls++
      return String(url).endsWith('/signin') ? ok(token()) : unauthorized()
    },
  })
  await client.signIn('qa@example.com', 'password')
  await expect(client.favorite('YI-0001', true)).rejects.toMatchObject({
    code: 'C4011',
  })
  expect(client.identity()).toBeNull()
  expect(calls).toBe(3)
})

test('늦게 도착한 로그인은 로그아웃 뒤 세션을 복구하지 않음', async () => {
  let resolve!: (response: Response) => void
  const client = createTeamBackend({
    baseUrl,
    fetcher: () =>
      new Promise<Response>((r) => {
        resolve = r
      }),
  })
  const login = client.signIn('qa@example.com', 'password')
  client.clearSession()
  resolve(ok(token()))
  await expect(login).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
  expect(client.identity()).toBeNull()
})

test('공통 오류 코드 보존, 서버 오류 본문 및 잘못된 envelope 거부', async () => {
  const malformed = createTeamBackend({
    baseUrl,
    fetcher: async () => Response.json({ places: [] }),
  })
  await expect(malformed.originPlaces('기흥역')).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  })
  const client = createTeamBackend({
    baseUrl,
    fetcher: async () =>
      Response.json(
        {
          data: null,
          error: { code: 'E5021', message: 'internal-sensitive-details' },
        },
        { status: 502 },
      ),
  })
  const error: unknown = await client.originPlaces('기흥역').catch((e) => e)
  expect(error).toBeInstanceOf(BackendError)
  expect(error).toMatchObject({ code: 'E5021', status: 502 })
  expect((error as Error).message).not.toContain('internal-sensitive-details')
})

test('BE 실제 경로, 0부터 페이지, 콤마 목록 및 저장 ID 구분', async () => {
  const calls: { url: URL; init?: RequestInit }[] = []
  const client = createTeamBackend({
    baseUrl,
    fetcher: async (url, init) => {
      calls.push({ url: new URL(String(url)), init })
      return ok({})
    },
  })
  await client.events({
    dateFrom: '2026-11-14',
    district: ['기흥구', '수지구'],
    page: 0,
    size: 20,
  })
  expect(calls[0].url.pathname).toBe('/api/events')
  expect(calls[0].url.searchParams.get('district')).toBe('기흥구,수지구')
  expect(calls[0].url.searchParams.get('page')).toBe('0')
  await client.parseSearch('이번 주말', '2026-11-14')
  expect(calls[1].url.pathname).toBe('/api/search/parse')
  expect(JSON.parse(String(calls[1].init?.body))).toEqual({
    query: '이번 주말',
    today: '2026-11-14',
  })
  await client.saveDemoCourse('itinerary-1', '내 일정')
  expect(calls[2].url.pathname).toBe('/api/me/courses')
  expect(JSON.parse(String(calls[2].init?.body))).toEqual({
    itineraryId: 'itinerary-1',
    title: '내 일정',
  })
  await client.deleteDemoCourse('course/1')
  expect(calls[3].url.pathname).toBe('/api/me/courses/course%2F1')
  expect(calls[3].init?.method).toBe('DELETE')
})

test('요청 취소와 타임아웃을 구분하고 잘못된 BE 주소를 차단', async () => {
  for (const base of [
    'https://backend.example.com/api',
    'https://user:password@backend.example.com',
    'http://backend.example.com',
  ])
    expect(() => createTeamBackend({ baseUrl: base })).toThrow()
  const fetcher: typeof fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(init.signal?.reason),
        { once: true },
      )
    })
  const client = createTeamBackend({ baseUrl, fetcher, timeoutMs: 10 })
  await expect(client.originPlaces('기흥역')).rejects.toMatchObject({
    code: 'TIMEOUT',
  })
  const controller = new AbortController()
  const pending = client.originPlaces('기흥역', controller.signal)
  controller.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
})

test('행사 코스 조건 변환과 카카오 ID 및 미지원 예산의 잘못된 전송 차단', () => {
  const settings: CourseSettings = {
    date: '2026-11-14',
    companion: '아이와',
    childAge: 7,
    transport: '자가용',
    origin: '기흥역',
    originLocation: { lat: 37.27, lng: 127.11 },
    startTime: '10:00',
    endTime: '18:00',
    budget: 0,
    activities: ['먹거리', '휴식'],
  }
  expect(itineraryInput('YI-1714', settings)).toMatchObject({
    baseEventId: 'YI-1714',
    companion: 'kids',
    kidsAge: 7,
    transport: 'car',
    budget: 'free',
    wants: ['food', 'rest'],
    origin: { type: 'manual', lat: 37.27, lng: 127.11 },
  })
  expect(() => itineraryInput('kakao:123', settings)).toThrow('행사 ID')
  expect(() =>
    itineraryInput('YI-1714', { ...settings, budget: 10000 }),
  ).toThrow('예산')
  expect(() =>
    itineraryInput('YI-1714', { ...settings, originLocation: null }),
  ).toThrow('좌표')
})
