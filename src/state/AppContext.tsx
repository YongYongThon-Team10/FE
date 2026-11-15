import type { ReactNode } from 'react'
import { useAppState } from '@/hooks/useAppState'
import { AppContext } from './context'
export function AppProvider({
  children,
  previewId,
}: {
  children: ReactNode
  previewId?: string
}) {
  const value = useAppState(previewId)
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
