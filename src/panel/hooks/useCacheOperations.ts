import { useState, useCallback, useEffect, useRef } from 'react'
import { MSG } from '../../shared/messageTypes'
import type {
  WriteFragmentResultMessage,
  CacheDataMessage,
  EvictCacheResultMessage,
  WriteCacheDataResultMessage,
  ResetCacheResultMessage,
} from '../../shared/messageTypes'
import { sendMessage, onMessage, sendAndWait } from '../utils/messaging'

export function useCacheOperations() {
  const [cacheData, setCacheData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const loadingRef = useRef(false)

  const readCache = useCallback(async () => {
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const result = await sendAndWait<CacheDataMessage>(
        { type: MSG.READ_CACHE },
        MSG.CACHE_DATA,
        10000,
      )
      if (result.payload.success) {
        setCacheData(result.payload.data ?? null)
      } else {
        setError(result.payload.error ?? 'Failed to read cache')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cache read failed')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  // Event-driven auto-refresh via WATCH_CACHE / UNWATCH_CACHE
  useEffect(() => {
    if (!autoRefresh) return

    // Listen for unsolicited CACHE_DATA pushes from the bridge
    const removeListener = onMessage((msg) => {
      if (msg.type === MSG.CACHE_DATA) {
        const payload = (msg as CacheDataMessage).payload
        if (payload.success) {
          setCacheData(payload.data ?? null)
        }
      }
    })

    // Tell the bridge to start watching
    sendMessage({ type: MSG.WATCH_CACHE })

    return () => {
      removeListener()
      sendMessage({ type: MSG.UNWATCH_CACHE })
    }
  }, [autoRefresh])

  const writeFragment = useCallback(
    async (
      fragmentString: string,
      data: Record<string, unknown>,
      typeName: string,
      cacheId: string,
    ) => {
      setError(null)
      try {
        const result = await sendAndWait<WriteFragmentResultMessage>(
          {
            type: MSG.WRITE_FRAGMENT,
            payload: { fragmentString, data, typeName, cacheId },
          },
          MSG.WRITE_FRAGMENT_RESULT,
          10000,
        )
        if (!result.payload.success) {
          setError(result.payload.error ?? 'Write failed')
          return false
        }
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Write failed')
        return false
      }
    },
    [],
  )

  const evictEntry = useCallback(async (cacheId: string) => {
    setError(null)
    try {
      const result = await sendAndWait<EvictCacheResultMessage>(
        {
          type: MSG.EVICT_CACHE,
          payload: { cacheId },
        },
        MSG.EVICT_CACHE_RESULT,
        5000,
      )
      if (!result.payload.success) {
        setError(result.payload.error ?? 'Evict failed')
        return false
      }
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evict failed')
      return false
    }
  }, [])

  const writeCacheData = useCallback(
    async (cacheId: string, data: Record<string, unknown>, typeName: string) => {
      setError(null)
      try {
        const result = await sendAndWait<WriteCacheDataResultMessage>(
          {
            type: MSG.WRITE_CACHE_DATA,
            payload: { cacheId, data, typeName },
          },
          MSG.WRITE_CACHE_DATA_RESULT,
          10000,
        )
        if (!result.payload.success) {
          setError(result.payload.error ?? 'Write cache data failed')
          return false
        }
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Write cache data failed')
        return false
      }
    },
    [],
  )

  const resetCache = useCallback(async () => {
    setError(null)
    try {
      const result = await sendAndWait<ResetCacheResultMessage>(
        { type: MSG.RESET_CACHE },
        MSG.RESET_CACHE_RESULT,
        10000,
      )
      if (!result.payload.success) {
        setError(result.payload.error ?? 'Reset cache failed')
        return false
      }
      setCacheData(null)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset cache failed')
      return false
    }
  }, [])

  return { cacheData, loading, error, readCache, writeFragment, evictEntry, writeCacheData, resetCache, clearError: () => setError(null), autoRefresh, setAutoRefresh }
}
