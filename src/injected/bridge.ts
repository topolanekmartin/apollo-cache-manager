import { getIntrospectionQuery } from 'graphql'
import gql from 'graphql-tag'
import { MSG } from '../shared/messageTypes'
import type { BridgeMessage, ExtensionMessage } from '../shared/messageTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

declare global {
  interface Window {
    __APOLLO_CLIENT__?: ApolloClientLike
    __APOLLO_CLIENTS__?: ApolloClientLike[]
  }
}

interface ApolloClientLike {
  cache: {
    extract: () => Record<string, unknown>
    evict: (options: { id: string }) => boolean
    gc: () => string[]
    writeFragment: (options: {
      id: string
      fragment: ReturnType<typeof gql>
      data: Record<string, unknown>
    }) => void
    reset: () => Promise<void>
    write: AnyFn
    modify: AnyFn
    [key: string]: unknown
  }
  query?: (options: { query: unknown; fetchPolicy?: string }) => Promise<{ data: unknown }>
  link?: unknown
  version?: string
}

const GRAPHQL_NAME_RE = /^[_A-Za-z][_0-9A-Za-z]*$/

function generateFragmentFromData(typeName: string, data: Record<string, unknown>, depth = 0): string {
  if (depth > 3) return ''

  const fields: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (key === '__typename') continue
    if (!GRAPHQL_NAME_RE.test(key)) continue

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>
      if ('__ref' in obj) {
        fields.push(key)
        continue
      }
      const nestedTypeName = (obj.__typename as string) ?? 'Unknown'
      const nested = generateFragmentFromData(nestedTypeName, obj, depth + 1)
      if (nested) {
        const nestedFields = nested.match(/\{([\s\S]*)\}/)?.[1]?.trim()
        if (nestedFields) {
          fields.push(`${key} { ${nestedFields} }`)
          continue
        }
      }
      fields.push(key)
      continue
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
        const arrObj = first as Record<string, unknown>
        if ('__ref' in arrObj) {
          fields.push(key)
          continue
        }
        const arrTypeName = (arrObj.__typename as string) ?? 'Unknown'
        const nested = generateFragmentFromData(arrTypeName, arrObj, depth + 1)
        if (nested) {
          const nestedFields = nested.match(/\{([\s\S]*)\}/)?.[1]?.trim()
          if (nestedFields) {
            fields.push(`${key} { ${nestedFields} }`)
            continue
          }
        }
      }
      fields.push(key)
      continue
    }

    fields.push(key)
  }

  if (fields.length === 0) return ''
  return `fragment CacheEdit on ${typeName} { ${fields.join(' ')} }`
}

const DEVTOOLS_SYMBOL = Symbol.for('apollo.devtools')

function getApolloClient(): ApolloClientLike | null {
  if (window.__APOLLO_CLIENT__) return window.__APOLLO_CLIENT__
  if (window.__APOLLO_CLIENTS__?.length) return window.__APOLLO_CLIENTS__[0]
  const symbolClients = (window as Record<symbol, unknown>)[DEVTOOLS_SYMBOL]
  if (Array.isArray(symbolClients) && symbolClients.length > 0) return symbolClients[0] as ApolloClientLike
  return null
}

function getApolloClientCount(): number {
  if (window.__APOLLO_CLIENTS__?.length) return window.__APOLLO_CLIENTS__.length
  const symbolClients = (window as Record<symbol, unknown>)[DEVTOOLS_SYMBOL]
  if (Array.isArray(symbolClients)) return symbolClients.length
  if (window.__APOLLO_CLIENT__) return 1
  return 0
}

function extractEndpointUri(client: ApolloClientLike): string | null {
  function findUri(link: unknown): string | null {
    if (!link || typeof link !== 'object') return null
    const obj = link as Record<string, unknown>

    // Check options.uri (HttpLink pattern)
    if (obj.options && typeof obj.options === 'object') {
      const opts = obj.options as Record<string, unknown>
      if (typeof opts.uri === 'string') return opts.uri
    }

    // Check direct uri property
    if (typeof obj.uri === 'string') return obj.uri

    // Traverse concat chain (right side is the terminating link)
    if (obj.right) {
      const found = findUri(obj.right)
      if (found) return found
    }

    // Traverse left side too
    if (obj.left) {
      const found = findUri(obj.left)
      if (found) return found
    }

    return null
  }

  return findUri(client.link)
}

function sendToContent(message: ExtensionMessage) {
  const bridgeMsg: BridgeMessage = {
    source: 'apollo-cache-manager-bridge',
    message,
  }
  window.postMessage(bridgeMsg, '*')
}

// --- Cache watcher state ---
let unwatchCache: (() => void) | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function stopWatching() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (unwatchCache) {
    unwatchCache()
    unwatchCache = null
  }
}

async function handleMessage(msg: ExtensionMessage) {
  switch (msg.type) {
    case MSG.DETECT_APOLLO: {
      const client = getApolloClient()
      sendToContent({
        type: MSG.APOLLO_DETECTED,
        payload: {
          detected: client !== null,
          clientCount: getApolloClientCount(),
        },
      })
      break
    }

    case MSG.INTROSPECT_SCHEMA: {
      try {
        const { endpoint, headers = {} } = msg.payload
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ query: getIntrospectionQuery() }),
        })
        const json = await response.json()
        sendToContent({
          type: MSG.SCHEMA_RESULT,
          payload: { success: true, data: json.data },
        })
      } catch (e) {
        sendToContent({
          type: MSG.SCHEMA_RESULT,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Introspection failed',
          },
        })
      }
      break
    }

    case MSG.AUTO_INTROSPECT: {
      try {
        const client = getApolloClient()
        if (!client) throw new Error('Apollo Client not found')

        // Stage 1: Try client.query() with 10s timeout
        if (client.query) {
          try {
            const queryPromise = client.query({
              query: gql(getIntrospectionQuery()),
              fetchPolicy: 'network-only',
            })
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 10_000),
            )
            const result = await Promise.race([queryPromise, timeoutPromise])
            sendToContent({ type: MSG.SCHEMA_RESULT, payload: { success: true, data: result.data } })
            break
          } catch {
            // Stage 1 failed — fall through to Stage 2
          }
        }

        // Stage 2: Extract endpoint URI from link chain → plain fetch
        const uri = extractEndpointUri(client)
        if (!uri) throw new Error('Could not auto-detect GraphQL endpoint. Use manual introspection.')

        const response = await fetch(uri, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: getIntrospectionQuery() }),
        })
        const json = await response.json()
        if (!json.data) throw new Error(json.errors?.[0]?.message ?? 'Introspection query returned no data')
        sendToContent({ type: MSG.SCHEMA_RESULT, payload: { success: true, data: json.data } })
      } catch (e) {
        sendToContent({
          type: MSG.SCHEMA_RESULT,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Auto-introspection failed',
          },
        })
      }
      break
    }

    case MSG.WRITE_FRAGMENT: {
      try {
        const client = getApolloClient()
        if (!client) throw new Error('Apollo Client not found')

        const { fragmentString, data, typeName, cacheId } = msg.payload
        const fragment = gql(fragmentString)

        client.cache.writeFragment({
          id: cacheId,
          fragment,
          data: { ...data, __typename: typeName },
        })

        sendToContent({
          type: MSG.WRITE_FRAGMENT_RESULT,
          payload: { success: true },
        })
      } catch (e) {
        sendToContent({
          type: MSG.WRITE_FRAGMENT_RESULT,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Write failed',
          },
        })
      }
      break
    }

    case MSG.READ_CACHE: {
      try {
        const client = getApolloClient()
        if (!client) throw new Error('Apollo Client not found')

        const data = client.cache.extract()
        sendToContent({
          type: MSG.CACHE_DATA,
          payload: { success: true, data },
        })
      } catch (e) {
        sendToContent({
          type: MSG.CACHE_DATA,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Cache read failed',
          },
        })
      }
      break
    }

    case MSG.EVICT_CACHE: {
      try {
        const client = getApolloClient()
        if (!client) throw new Error('Apollo Client not found')

        client.cache.evict({ id: msg.payload.cacheId })
        client.cache.gc()

        sendToContent({
          type: MSG.EVICT_CACHE_RESULT,
          payload: { success: true },
        })
      } catch (e) {
        sendToContent({
          type: MSG.EVICT_CACHE_RESULT,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Evict failed',
          },
        })
      }
      break
    }

    case MSG.WRITE_CACHE_DATA: {
      try {
        const client = getApolloClient()
        if (!client) throw new Error('Apollo Client not found')

        const { cacheId, data, typeName } = msg.payload
        const fragmentString = generateFragmentFromData(typeName, data)
        if (!fragmentString) throw new Error('Could not generate fragment from data')

        const fragment = gql(fragmentString)
        client.cache.writeFragment({
          id: cacheId,
          fragment,
          data: { ...data, __typename: typeName },
        })

        sendToContent({
          type: MSG.WRITE_CACHE_DATA_RESULT,
          payload: { success: true },
        })
      } catch (e) {
        sendToContent({
          type: MSG.WRITE_CACHE_DATA_RESULT,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Write cache data failed',
          },
        })
      }
      break
    }

    case MSG.RESET_CACHE: {
      try {
        const client = getApolloClient()
        if (!client) throw new Error('Apollo Client not found')

        await client.cache.reset()

        sendToContent({
          type: MSG.RESET_CACHE_RESULT,
          payload: { success: true },
        })
      } catch (e) {
        sendToContent({
          type: MSG.RESET_CACHE_RESULT,
          payload: {
            success: false,
            error: e instanceof Error ? e.message : 'Reset cache failed',
          },
        })
      }
      break
    }

    case MSG.WATCH_CACHE: {
      // Stop any existing watcher first
      stopWatching()

      const client = getApolloClient()
      if (!client) break

      // Send initial cache snapshot immediately
      try {
        const data = client.cache.extract()
        sendToContent({ type: MSG.CACHE_DATA, payload: { success: true, data } })
      } catch {
        // ignore initial read failure
      }

      // Debounced flush: extract cache and send to panel
      const flush = () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          debounceTimer = null
          try {
            const freshClient = getApolloClient()
            if (!freshClient) return
            const snapshot = freshClient.cache.extract()
            sendToContent({ type: MSG.CACHE_DATA, payload: { success: true, data: snapshot } })
          } catch {
            // silently skip failed extracts
          }
        }, 200)
      }

      // Monkey-patch cache mutation methods
      const cache = client.cache
      const methodsToPath = ['write', 'modify', 'evict'] as const
      const originals = new Map<string, AnyFn>()
      let patched = false

      try {
        for (const name of methodsToPath) {
          const orig = cache[name]
          if (typeof orig !== 'function') continue
          originals.set(name, orig as AnyFn)
          // Patch on the instance (not prototype) so it's easily reversible
          ;(cache as Record<string, unknown>)[name] = function (this: unknown, ...args: unknown[]) {
            const result = (orig as AnyFn).apply(this, args)
            flush()
            return result
          }
        }
        patched = originals.size > 0
      } catch {
        // Patching failed (frozen object, etc.) — restore any partial patches
        for (const [name, orig] of originals) {
          ;(cache as Record<string, unknown>)[name] = orig
        }
        originals.clear()
        patched = false
      }

      if (patched) {
        // Cleanup: restore original methods
        unwatchCache = () => {
          for (const [name, orig] of originals) {
            ;(cache as Record<string, unknown>)[name] = orig
          }
          originals.clear()
        }
      } else {
        // Fallback: poll every 2s with change detection
        let lastJson = ''
        const intervalId = setInterval(() => {
          try {
            const freshClient = getApolloClient()
            if (!freshClient) return
            const snapshot = freshClient.cache.extract()
            const json = JSON.stringify(snapshot)
            if (json !== lastJson) {
              lastJson = json
              sendToContent({ type: MSG.CACHE_DATA, payload: { success: true, data: snapshot } })
            }
          } catch {
            // silently skip
          }
        }, 2000)
        unwatchCache = () => clearInterval(intervalId)
      }
      break
    }

    case MSG.UNWATCH_CACHE: {
      stopWatching()
      break
    }
  }
}

// Listen for messages from content script
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return
  const data = event.data as BridgeMessage
  if (data?.source !== 'apollo-cache-manager-content') return
  handleMessage(data.message)
})
