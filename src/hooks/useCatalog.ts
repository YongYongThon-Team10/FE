import { useCallback, useEffect, useRef, useState } from 'react'
import type { Catalog } from '@/domain/models'
import { api, isDemo, refreshMs } from '@/services/api'
import { demoCatalog } from '@/data/demo'

export function useCatalog() {
  const [data, setData] = useState<Catalog | null>(isDemo ? demoCatalog : null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isDemo)
  const [refreshing, setRefreshing] = useState(false)
  const active = useRef<AbortController | null>(null)
  const reload = useCallback(async () => {
    if (isDemo) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setRefreshing(true)
    try {
      const result = await api.catalog(controller.signal)
      if (!controller.signal.aborted) {
        setData(result)
        setError('')
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했어요.')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])
  useEffect(() => {
    const startup = window.setTimeout(() => void reload(), 0)
    const refresh = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const timer = window.setInterval(refresh, refreshMs)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active.current?.abort()
      window.clearTimeout(startup)
      window.clearInterval(timer)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [reload])
  return { data, error, loading, refreshing, reload }
}
