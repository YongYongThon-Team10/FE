import { useState } from 'react'
export function readStorage<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => T,
): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? validate(JSON.parse(raw)) : fallback
  } catch {
    return fallback
  }
}
export function useStorage<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => T,
  serialize: (value: T) => unknown = (value) => value,
) {
  const [value, setValue] = useState(() => readStorage(key, fallback, validate))
  const [storageError, setStorageError] = useState('')
  const update = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(key, JSON.stringify(serialize(next)))
      setStorageError('')
      return true
    } catch {
      setStorageError(
        '브라우저 저장 공간을 사용할 수 없어요. 현재 화면에서는 계속 편집할 수 있지만 새로고침하면 변경 내용이 사라져요.',
      )
      return false
    }
  }
  return [value, update, storageError] as const
}
