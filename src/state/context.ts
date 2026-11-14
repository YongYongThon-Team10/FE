import { createContext, useContext } from 'react'
import type { useAppState } from '@/hooks/useAppState'
export const AppContext = createContext<ReturnType<typeof useAppState> | null>(
  null,
)
export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('AppProvider is required')
  return value
}
