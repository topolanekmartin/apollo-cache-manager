import { useState, useCallback } from 'react'
import { MSG } from '../../shared/messageTypes'
import type {
  WriteFragmentResultMessage,
  CacheDataMessage,
  EvictCacheResultMessage,
  WriteCacheDataResultMessage,
  ResetCacheResultMessage,
} from '../../shared/messageTypes'
import { sendAndWait } from '../utils/messaging'

export function useCacheOperations() {
  const [cacheData, setCacheData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readCache = useCallback(async () => {
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
      setLoading(false)
    }
  }, [])

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

  return { cacheData, loading, error, readCache, writeFragment, evictEntry, writeCacheData, resetCache, clearError: () => setError(null) }
}
