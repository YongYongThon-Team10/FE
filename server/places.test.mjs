import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchPlaces } from './places.mjs'
const request = (q, page = '1', method = 'GET') =>
  new Request(
    `https://site.example/api/places?q=${encodeURIComponent(q)}&page=${page}`,
    { method },
  )
const doc = {
  id: '12345',
  place_name: '검증용 장소',
  category_name: '여행 > 공원',
  category_group_code: 'AT4',
  address_name: '경기 용인시 기흥구 중동 1',
  road_address_name: '경기 용인시 기흥구 검증로 1',
  phone: '031-123-4567',
  x: '127.1',
  y: '37.2',
}
const payload = (documents = [doc]) => ({
  documents,
  meta: { is_end: false, total_count: 30, pageable_count: 30 },
})

test('REST key stays in upstream header, results preserve actual fields and filter other cities', async () => {
  let called = false
  const response = await searchPlaces(
    request('공원', '2'),
    { KAKAO_REST_API_KEY: 'server-secret' },
    async (url, init) => {
      const u = new URL(url)
      assert.equal(u.origin, 'https://dapi.kakao.com')
      assert.equal(u.searchParams.get('query'), '용인 공원')
      assert.equal(u.searchParams.get('page'), '2')
      assert.equal(init.headers.Authorization, 'KakaoAK server-secret')
      called = true
      return Response.json(
        payload([
          doc,
          { ...doc, id: '2', address_name: '경기 수원시 영통구 1' },
        ]),
      )
    },
  )
  assert.ok(called)
  assert.equal(response.status, 200)
  const value = await response.json()
  assert.equal(value.places.length, 1)
  assert.equal(value.places[0].phone, doc.phone)
  assert.equal(value.places[0].url, 'https://place.map.kakao.com/12345')
  assert.equal(value.page, 2)
  assert.equal(value.isEnd, false)
  assert.ok(!JSON.stringify(value).includes('server-secret'))
  assert.ok(!('price' in value.places[0]))
})
test('invalid inputs, page bounds, methods, and missing secret never call Kakao', async () => {
  const noCall = async () => {
    throw new Error('must not be called')
  }
  for (const req of [
    request(''),
    request('x'.repeat(121)),
    request('공원', '0'),
    request('공원', '46'),
    request('공원', '1.2'),
  ])
    assert.equal(
      (await searchPlaces(req, { KAKAO_REST_API_KEY: 'secret' }, noCall))
        .status,
      400,
    )
  assert.equal(
    (await searchPlaces(request('공원', '1', 'POST'), {}, noCall)).status,
    405,
  )
  assert.equal((await searchPlaces(request('공원'), {}, noCall)).status, 503)
})
test('upstream errors, timeouts and empty results never substitute demo places', async () => {
  for (const status of [401, 403, 429, 500]) {
    const response = await searchPlaces(
      request('공원'),
      { KAKAO_REST_API_KEY: 'secret' },
      async () => new Response('sensitive upstream body', { status }),
    )
    assert.equal(response.status, status === 429 ? 429 : 502)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.ok(!(await response.text()).includes('sensitive'))
  }
  assert.equal(
    (
      await searchPlaces(
        request('공원'),
        { KAKAO_REST_API_KEY: 'secret' },
        async () => {
          throw new Error('network')
        },
      )
    ).status,
    502,
  )
  const empty = await searchPlaces(
    request('없는장소'),
    { KAKAO_REST_API_KEY: 'secret' },
    async () =>
      Response.json({
        documents: [],
        meta: { is_end: true, total_count: 0, pageable_count: 0 },
      }),
  )
  assert.deepEqual((await empty.json()).places, [])
})
test('malformed upstream payload and invalid coordinates are handled safely', async () => {
  assert.equal(
    (
      await searchPlaces(
        request('공원'),
        { KAKAO_REST_API_KEY: 'secret' },
        async () => Response.json({}),
      )
    ).status,
    502,
  )
  const invalid = await searchPlaces(
    request('공원'),
    { KAKAO_REST_API_KEY: 'secret' },
    async () => Response.json(payload([{ ...doc, x: 'NaN' }])),
  )
  assert.deepEqual((await invalid.json()).places, [])
})
