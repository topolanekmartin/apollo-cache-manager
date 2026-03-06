import { useState, useCallback, useRef } from 'react'

interface NavState {
  history: string[]
  index: number
}

interface NavigationHistory {
  currentKey: string | null
  navigate: (key: string | null) => void
  goBack: () => void
  goForward: () => void
  canGoBack: boolean
  canGoForward: boolean
  expandedPaths: Set<string>
  onExpandedPathsChange: (paths: Set<string>) => void
}

const EMPTY: NavState = { history: [], index: -1 }

export function useNavigationHistory(): NavigationHistory {
  const [state, setState] = useState<NavState>(EMPTY)
  const expandedPathsMapRef = useRef<Map<number, Set<string>>>(new Map())
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const currentKey = state.index >= 0 && state.index < state.history.length
    ? state.history[state.index]
    : null

  const onExpandedPathsChange = useCallback((paths: Set<string>) => {
    setExpandedPaths(paths)
    // Also persist to map for current index
    setState(prev => {
      if (prev.index >= 0) {
        expandedPathsMapRef.current.set(prev.index, paths)
      }
      return prev // no state change, just side-effect on ref
    })
  }, [])

  const navigate = useCallback((key: string | null) => {
    if (key === null) {
      setState(EMPTY)
      expandedPathsMapRef.current.clear()
      setExpandedPaths(new Set())
      return
    }

    setState(prev => {
      const { history, index } = prev
      const current = index >= 0 && index < history.length ? history[index] : null

      // Don't push duplicate
      if (current === key) return prev

      // Save current expanded paths before navigating
      // (already saved via onExpandedPathsChange, but ensure latest)

      // Truncate forward history and clear orphaned expanded paths
      const newIndex = index + 1
      for (let i = newIndex; i < history.length; i++) {
        expandedPathsMapRef.current.delete(i)
      }

      const truncated = history.slice(0, newIndex)
      return { history: [...truncated, key], index: newIndex }
    })

    // New entity starts collapsed
    setExpandedPaths(new Set())
  }, [])

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.index <= 0) return prev
      const newIndex = prev.index - 1
      // Restore expanded paths for the target index
      const restored = expandedPathsMapRef.current.get(newIndex) ?? new Set<string>()
      setExpandedPaths(restored)
      return { ...prev, index: newIndex }
    })
  }, [])

  const goForward = useCallback(() => {
    setState(prev => {
      if (prev.index >= prev.history.length - 1) return prev
      const newIndex = prev.index + 1
      const restored = expandedPathsMapRef.current.get(newIndex) ?? new Set<string>()
      setExpandedPaths(restored)
      return { ...prev, index: newIndex }
    })
  }, [])

  const canGoBack = state.index > 0
  const canGoForward = state.index < state.history.length - 1

  return { currentKey, navigate, goBack, goForward, canGoBack, canGoForward, expandedPaths, onExpandedPathsChange }
}
