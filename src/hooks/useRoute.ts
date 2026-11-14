import { useSyncExternalStore } from 'react'
let depth = Number(window.history.state?.yonginDepth ?? 0)
window.history.replaceState({ ...window.history.state, yonginDepth: depth }, '')
const subscribe = (listener: () => void) => {
  const change = () => {
    if (window.history.state?.yonginDepth === undefined)
      window.history.replaceState(
        { ...window.history.state, yonginDepth: depth + 1 },
        '',
      )
    depth = Number(window.history.state.yonginDepth)
    listener()
  }
  window.addEventListener('hashchange', change)
  return () => window.removeEventListener('hashchange', change)
}
const snapshot = () => window.location.hash.slice(1) || '/'
export function useRoute() {
  return useSyncExternalStore(subscribe, snapshot)
}
export function go(path: string) {
  window.location.hash = path
}
