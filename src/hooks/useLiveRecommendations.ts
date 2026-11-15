import { useEffect, useState } from 'react'
import type {
  RecommendationRequest,
  RecommendationResponse,
} from '../domain/personalization'
import { intelligence, intelligenceMode } from '../services/intelligence'

type Resource = {
  key: string
  data?: RecommendationResponse
  error?: string
  refreshing: boolean
}
export function useLiveRecommendations(input: RecommendationRequest): {
  data?: RecommendationResponse
  error?: string
  refreshing: boolean
  retry: () => void
} {
  const key = JSON.stringify(input)
  const [resource, setResource] = useState<Resource | null>(null)
  const [attempt, retry] = useState(0)
  useEffect(() => {
    let controller: AbortController | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    const fetchLatest = async () => {
      if (document.visibilityState === 'hidden') return
      clearTimeout(timer)
      controller?.abort()
      controller = new AbortController()
      const current = controller
      setResource((old) => ({
        key,
        data: old?.key === key ? old.data : undefined,
        refreshing: true,
      }))
      let refreshAfter = 30
      try {
        const input = JSON.parse(key) as RecommendationRequest
        const data = await intelligence.recommend(
          intelligenceMode === 'api'
            ? { ...input, visitAt: new Date().toISOString() }
            : input,
          current.signal,
        )
        if (!current.signal.aborted && !disposed) {
          setResource({ key, data, refreshing: false })
          refreshAfter = data.refreshAfterSeconds
        }
      } catch (error) {
        if (!current.signal.aborted && !disposed)
          setResource((old) => ({
            key,
            data: old?.key === key ? old.data : undefined,
            refreshing: false,
            error:
              error instanceof Error
                ? error.message
                : '추천 정보를 불러오지 못했어요.',
          }))
      } finally {
        if (!disposed && !current.signal.aborted)
          timer = setTimeout(() => void fetchLatest(), refreshAfter * 1000)
      }
    }
    const resume = () => {
      if (document.visibilityState === 'visible') void fetchLatest()
    }
    void fetchLatest()
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('online', resume)
    return () => {
      disposed = true
      controller?.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('online', resume)
    }
  }, [key, attempt])
  return {
    ...(resource?.key === key ? resource : { refreshing: true }),
    retry: () => retry((value) => value + 1),
  }
}
