import type { ReactNode } from 'react'
import { useAppState } from '@/hooks/useAppState'
import { AppContext } from './context'
export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState()
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
