export enum MSG {
  // Detection
  DETECT_APOLLO = 'DETECT_APOLLO',
  APOLLO_DETECTED = 'APOLLO_DETECTED',

  // Schema
  INTROSPECT_SCHEMA = 'INTROSPECT_SCHEMA',
  AUTO_INTROSPECT = 'AUTO_INTROSPECT',
  SCHEMA_RESULT = 'SCHEMA_RESULT',

  // Cache operations
  WRITE_FRAGMENT = 'WRITE_FRAGMENT',
  WRITE_FRAGMENT_RESULT = 'WRITE_FRAGMENT_RESULT',
  READ_CACHE = 'READ_CACHE',
  CACHE_DATA = 'CACHE_DATA',
  EVICT_CACHE = 'EVICT_CACHE',
  EVICT_CACHE_RESULT = 'EVICT_CACHE_RESULT',
  WRITE_CACHE_DATA = 'WRITE_CACHE_DATA',
  WRITE_CACHE_DATA_RESULT = 'WRITE_CACHE_DATA_RESULT',
  RESET_CACHE = 'RESET_CACHE',
  RESET_CACHE_RESULT = 'RESET_CACHE_RESULT',
}

export interface DetectApolloMessage {
  type: MSG.DETECT_APOLLO
}

export interface ApolloDetectedMessage {
  type: MSG.APOLLO_DETECTED
  payload: {
    detected: boolean
    clientCount: number
  }
}

export interface AutoIntrospectMessage {
  type: MSG.AUTO_INTROSPECT
}

export interface IntrospectSchemaMessage {
  type: MSG.INTROSPECT_SCHEMA
  payload: {
    endpoint: string
    headers?: Record<string, string>
  }
}

export interface SchemaResultMessage {
  type: MSG.SCHEMA_RESULT
  payload: {
    success: boolean
    data?: unknown
    error?: string
  }
}

export interface WriteFragmentMessage {
  type: MSG.WRITE_FRAGMENT
  payload: {
    fragmentString: string
    data: Record<string, unknown>
    typeName: string
    cacheId: string
  }
}

export interface WriteFragmentResultMessage {
  type: MSG.WRITE_FRAGMENT_RESULT
  payload: {
    success: boolean
    error?: string
  }
}

export interface ReadCacheMessage {
  type: MSG.READ_CACHE
}

export interface CacheDataMessage {
  type: MSG.CACHE_DATA
  payload: {
    success: boolean
    data?: Record<string, unknown>
    error?: string
  }
}

export interface EvictCacheMessage {
  type: MSG.EVICT_CACHE
  payload: {
    cacheId: string
  }
}

export interface EvictCacheResultMessage {
  type: MSG.EVICT_CACHE_RESULT
  payload: {
    success: boolean
    error?: string
  }
}

export interface WriteCacheDataMessage {
  type: MSG.WRITE_CACHE_DATA
  payload: { cacheId: string; data: Record<string, unknown>; typeName: string }
}

export interface WriteCacheDataResultMessage {
  type: MSG.WRITE_CACHE_DATA_RESULT
  payload: { success: boolean; error?: string }
}

export interface ResetCacheMessage {
  type: MSG.RESET_CACHE
}

export interface ResetCacheResultMessage {
  type: MSG.RESET_CACHE_RESULT
  payload: { success: boolean; error?: string }
}

export type ExtensionMessage =
  | DetectApolloMessage
  | ApolloDetectedMessage
  | AutoIntrospectMessage
  | IntrospectSchemaMessage
  | SchemaResultMessage
  | WriteFragmentMessage
  | WriteFragmentResultMessage
  | ReadCacheMessage
  | CacheDataMessage
  | EvictCacheMessage
  | EvictCacheResultMessage
  | WriteCacheDataMessage
  | WriteCacheDataResultMessage
  | ResetCacheMessage
  | ResetCacheResultMessage

// Wrapper for messages sent via window.postMessage
export interface BridgeMessage {
  source: 'apollo-cache-manager-bridge' | 'apollo-cache-manager-content'
  message: ExtensionMessage
}

// Wrapper for messages sent via chrome.runtime
export interface RuntimeMessage {
  source: 'apollo-cache-manager'
  tabId?: number
  message: ExtensionMessage
}
