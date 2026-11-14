import { useEffect, useState } from 'react'

export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
) {
  const [value, setValue] = useState<{
    key: string
    data?: T
    error?: string
  }>()
  const [attempt, retry] = useState(0)
  const current = `${key}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setValue({ key: current, data })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setValue({
            key: current,
            error:
              error instanceof Error
                ? error.message
                : '정보를 불러오지 못했어요.',
          })
      })
    return () => controller.abort()
    // Request arguments are represented by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])
  return {
    data: value?.key === current ? value.data : undefined,
    error: value?.key === current ? value.error : undefined,
    retry: () => retry((n) => n + 1),
  }
}
