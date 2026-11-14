const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  })
const requests = new Map()

export async function searchPlaces(request, env, fetcher = fetch) {
  if (request.method !== 'GET')
    return json({ error: 'GET 요청만 지원합니다.' }, 405, { Allow: 'GET' })
  const params = new URL(request.url).searchParams
  const nearby = new URL(request.url).pathname === '/api/nearby'
  const group = params.get('category')
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const radius = Number(params.get('radius') ?? 1000)
  if (
    nearby &&
    (!['FD6', 'CE7'].includes(group) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < 37.08 ||
      lat > 37.42 ||
      lng < 127 ||
      lng > 127.45 ||
      !Number.isInteger(radius) ||
      radius < 500 ||
      radius > 5000)
  )
    return json(
      {
        error:
          '용인시의 기준 좌표와 500~5000m 반경, 음식점 또는 카페를 선택해 주세요.',
      },
      400,
    )
  const q = nearby ? group : (params.get('q') ?? '').trim()
  const page = Number(params.get('page') ?? 1)
  if (
    !q ||
    q.length > 120 ||
    [...q].some((char) => char.charCodeAt(0) < 32) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 45
  )
    return json(
      { error: '검색어는 1~120자, 페이지는 1~45 사이로 입력해 주세요.' },
      400,
    )
  if (!env.KAKAO_REST_API_KEY)
    return json(
      { error: '장소 검색 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.' },
      503,
    )
  // Bound per-isolate memory; this limits bursts without storing visitor data.
  const now = Date.now()
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  if (requests.size > 2000) requests.clear()
  const bucket = requests.get(ip)
  if (bucket && now - bucket.start < 60000 && bucket.count >= 60)
    return json(
      { error: '검색 요청이 많아요. 잠시 후 다시 시도해 주세요.' },
      429,
      { 'Retry-After': '60' },
    )
  requests.set(
    ip,
    bucket && now - bucket.start < 60000
      ? { ...bucket, count: bucket.count + 1 }
      : { start: now, count: 1 },
  )
  const upstream = new URL(
    nearby
      ? 'https://dapi.kakao.com/v2/local/search/category.json'
      : 'https://dapi.kakao.com/v2/local/search/keyword.json',
  )
  if (nearby) {
    upstream.searchParams.set('category_group_code', group)
    upstream.searchParams.set('x', String(lng))
    upstream.searchParams.set('y', String(lat))
    upstream.searchParams.set('radius', String(radius))
    upstream.searchParams.set('sort', 'distance')
  } else
    upstream.searchParams.set('query', q.includes('용인') ? q : `용인 ${q}`)
  upstream.searchParams.set('page', String(page))
  upstream.searchParams.set('size', '15')
  upstream.searchParams.set('rect', '127.00,37.08,127.45,37.42')
  try {
    const response = await fetcher(upstream.toString(), {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
    })
    if (!response.ok)
      return json(
        {
          error:
            response.status === 429
              ? '카카오 검색 이용량이 많아요. 잠시 후 다시 시도해 주세요.'
              : '카카오 장소 검색에 연결하지 못했어요. 다시 시도해 주세요.',
        },
        response.status === 429 ? 429 : 502,
      )
    const value = await response.json()
    if (
      !Array.isArray(value.documents) ||
      !value.meta ||
      typeof value.meta.is_end !== 'boolean'
    )
      throw new Error('invalid response')
    const places = value.documents
      .filter(
        (p) =>
          typeof p.id === 'string' &&
          typeof p.place_name === 'string' &&
          (!nearby || p.category_group_code === group) &&
          /^(?:경기|경기도) 용인시/.test(p.address_name ?? '') &&
          Number.isFinite(Number(p.y)) &&
          Number.isFinite(Number(p.x)) &&
          Number(p.y) !== 0 &&
          Number(p.x) !== 0,
      )
      .map((p) => ({
        id: p.id,
        name: p.place_name,
        category: p.category_name ?? '',
        categoryGroup: p.category_group_code ?? '',
        address: p.address_name ?? '',
        roadAddress: p.road_address_name ?? '',
        phone: p.phone ?? '',
        distanceMeters:
          p.distance !== '' && Number.isFinite(Number(p.distance))
            ? Number(p.distance)
            : null,
        location: { lat: Number(p.y), lng: Number(p.x) },
        url: `https://place.map.kakao.com/${encodeURIComponent(p.id)}`,
      }))
    return json(
      {
        places,
        query: q,
        page,
        isEnd: value.meta.is_end,
        totalCount: value.meta.total_count,
        pageableCount: value.meta.pageable_count,
        source: '카카오맵',
        fetchedAt: new Date().toISOString(),
      },
      200,
      { 'Cache-Control': 'public, max-age=60' },
    )
  } catch {
    return json(
      {
        error:
          '장소 검색 응답이 지연되거나 올바르지 않아요. 다시 시도해 주세요.',
      },
      502,
    )
  }
}
