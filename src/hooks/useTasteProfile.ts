import { useMemo, useState } from 'react'
import { defaultTaste, parseTaste } from '../domain/taste'
import type { TasteProfile } from '../domain/taste'
import { readStorage } from './useStorage'

export function useTasteProfile(accountId: string, persistent = true) {
  const key = `yongin.taste.v1.${encodeURIComponent(accountId)}`
  const [entry, setEntry] = useState<{
    key: string
    profile: TasteProfile
  } | null>(null)
  const [error, setError] = useState('')
  const profile = useMemo(
    () =>
      entry?.key === key
        ? entry.profile
        : persistent
          ? readStorage(key, defaultTaste(), parseTaste)
          : defaultTaste(),
    [entry, key, persistent],
  )
  const save = (value: TasteProfile) => {
    const next = parseTaste(value)
    setEntry({ key, profile: next })
    try {
      if (persistent) localStorage.setItem(key, JSON.stringify(next))
      setError('')
      return true
    } catch {
      setError(
        '브라우저에 선호도를 저장하지 못했어요. 새로고침 전까지 현재 화면에는 반영돼요.',
      )
      return false
    }
  }
  return {
    tasteProfile: profile,
    saveTasteProfile: save,
    tasteStorageError: error,
  }
}
