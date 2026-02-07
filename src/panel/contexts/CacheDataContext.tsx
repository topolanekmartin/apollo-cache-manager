import { createContext, useContext, type FC, type ReactNode } from 'react'

const CacheDataContext = createContext<Record<string, unknown> | null>(null)

interface CacheDataProviderProps {
  value: Record<string, unknown> | null
  children: ReactNode
}

export const CacheDataProvider: FC<CacheDataProviderProps> = ({ value, children }) => {
  return <CacheDataContext.Provider value={value}>{children}</CacheDataContext.Provider>
}

export function useCacheData(): Record<string, unknown> | null {
  return useContext(CacheDataContext)
}
