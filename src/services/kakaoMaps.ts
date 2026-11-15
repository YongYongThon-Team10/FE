export type KakaoPoint = { getLat(): number; getLng(): number }
export type KakaoMap = {
  setBounds(
    bounds: KakaoBounds,
    top?: number,
    right?: number,
    bottom?: number,
    left?: number,
  ): void
  setCenter(point: KakaoPoint): void
  panTo(point: KakaoPoint): void
  relayout(): void
}
export type KakaoBounds = { extend(point: KakaoPoint): void }
export type KakaoLayer = { setMap(map: KakaoMap | null): void }
export type KakaoMaps = {
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => KakaoPoint
  LatLngBounds: new () => KakaoBounds
  Map: new (
    container: HTMLElement,
    options: { center: KakaoPoint; level: number; scrollwheel: boolean },
  ) => KakaoMap
  CustomOverlay: new (options: {
    position: KakaoPoint
    content: HTMLElement
    yAnchor?: number
    xAnchor?: number
    zIndex?: number
  }) => KakaoLayer
  Polyline: new (options: {
    path: KakaoPoint[]
    strokeWeight: number
    strokeColor: string
    strokeOpacity: number
    strokeStyle: string
  }) => KakaoLayer
}

export const kakaoJavaScriptKey = (
  import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY ?? ''
).trim()
let loading: Promise<KakaoMaps> | null = null
const sdkWindow = () => window as Window & { kakao?: { maps?: KakaoMaps } }

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (loading) return loading
  if (!kakaoJavaScriptKey)
    return Promise.reject(new Error('카카오 지도 키가 설정되지 않았어요.'))
  loading = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement('script')
    let settled = false
    const timer = window.setTimeout(() => fail(), 15000)
    const fail = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      script.remove()
      loading = null
      reject(
        new Error(
          '카카오 지도를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
        ),
      )
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoJavaScriptKey)}&autoload=false`
    script.async = true
    script.onerror = fail
    script.onload = () => {
      const maps = sdkWindow().kakao?.maps
      if (!maps) {
        fail()
        return
      }
      maps.load(() => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(maps)
      })
    }
    document.head.append(script)
  })
  return loading
}
