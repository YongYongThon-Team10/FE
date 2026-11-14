import { useCallback, useEffect, useRef, useState } from 'react'
import type { FacilityCatalog } from '@/domain/facilities'
import { parseFacilityCatalog } from '@/domain/facilities'
import { facilityDemo } from '@/data/facilities'
import { isDemo, refreshMs, request } from '@/services/api'
export function useFacilities() {
  const [data, setData] = useState<FacilityCatalog | null>(
    isDemo ? facilityDemo : null,
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isDemo)
  const active = useRef<AbortController | null>(null)
  const reload = useCallback(async () => {
    if (isDemo) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    try {
      const result = parseFacilityCatalog(
        await request('/facilities', {
          signal: controller.signal,
          cache: 'no-store',
        }),
      )
      if (!controller.signal.aborted) {
        setData(result)
        setError('')
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : '시설 정보를 불러오지 못했어요.',
        )
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const start = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, refreshMs)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
      active.current?.abort()
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [reload])
  return { data, error, loading, reload }
}
