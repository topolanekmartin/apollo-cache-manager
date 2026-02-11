import { useState, useEffect, useCallback, useRef } from 'react'
import { MSG } from '../../shared/messageTypes'
import type {
  MutationMockDef,
  InstallMockLinkResultMessage,
  UpdateMutationMocksResultMessage,
} from '../../shared/messageTypes'
import { sendAndWait, sendMessage, onMessage } from '../utils/messaging'

const STORAGE_KEY = 'apollo-cache-manager-mutation-mocks'

export interface InterceptedEntry {
  operationName: string
  mockId: string
  timestamp: number
}

function loadMocks(): Promise<MutationMockDef[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve((result[STORAGE_KEY] as MutationMockDef[]) ?? [])
    })
  })
}

function saveMocks(mocks: MutationMockDef[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: mocks }, resolve)
  })
}

export function useMutationMocks(apolloDetected: boolean) {
  const [mocks, setMocks] = useState<MutationMockDef[]>([])
  const [interceptedLog, setInterceptedLog] = useState<InterceptedEntry[]>([])
  const [linkInstalled, setLinkInstalled] = useState(false)
  const linkInstalledRef = useRef(false)

  // Load mocks from storage on mount
  useEffect(() => {
    loadMocks().then(setMocks)
  }, [])

  // Listen for MUTATION_INTERCEPTED notifications
  useEffect(() => {
    const cleanup = onMessage((msg) => {
      if (msg.type === MSG.MUTATION_INTERCEPTED) {
        setInterceptedLog((prev) => {
          const next = [msg.payload, ...prev]
          return next.slice(0, 20)
        })
      }
    })
    return cleanup
  }, [])

  // Sync active mocks to bridge whenever mocks change
  const syncMocks = useCallback(
    async (mocksToSync: MutationMockDef[]) => {
      if (!linkInstalledRef.current) return
      try {
        await sendAndWait<UpdateMutationMocksResultMessage>(
          { type: MSG.UPDATE_MUTATION_MOCKS, payload: { mocks: mocksToSync } },
          MSG.UPDATE_MUTATION_MOCKS_RESULT,
          3000,
        )
      } catch {
        // sync failed silently
      }
    },
    [],
  )

  // Install mock link into Apollo Client
  const installLink = useCallback(async () => {
    try {
      const result = await sendAndWait<InstallMockLinkResultMessage>(
        { type: MSG.INSTALL_MOCK_LINK },
        MSG.INSTALL_MOCK_LINK_RESULT,
        5000,
      )
      if (result.payload.success) {
        setLinkInstalled(true)
        linkInstalledRef.current = true
        return true
      }
    } catch {
      // install failed
    }
    return false
  }, [])

  // Auto-install link when Apollo is detected and there are active mocks
  useEffect(() => {
    if (!apolloDetected) {
      // Page reloaded — reset installed state
      setLinkInstalled(false)
      linkInstalledRef.current = false
      return
    }

    const hasActiveMocks = mocks.some((m) => m.active)
    if (hasActiveMocks && !linkInstalledRef.current) {
      installLink().then((installed) => {
        if (installed) {
          syncMocks(mocks)
        }
      })
    }
  }, [apolloDetected, mocks, installLink, syncMocks])

  // CRUD operations

  const addMock = useCallback(
    async (mock: MutationMockDef) => {
      const updated = [...mocks, mock]
      await saveMocks(updated)
      setMocks(updated)
      syncMocks(updated)
    },
    [mocks, syncMocks],
  )

  const updateMock = useCallback(
    async (mock: MutationMockDef) => {
      const updated = mocks.map((m) => (m.id === mock.id ? mock : m))
      await saveMocks(updated)
      setMocks(updated)
      syncMocks(updated)
    },
    [mocks, syncMocks],
  )

  const deleteMock = useCallback(
    async (id: string) => {
      const updated = mocks.filter((m) => m.id !== id)
      await saveMocks(updated)
      setMocks(updated)
      syncMocks(updated)
    },
    [mocks, syncMocks],
  )

  const toggleMock = useCallback(
    async (id: string) => {
      const updated = mocks.map((m) =>
        m.id === id ? { ...m, active: !m.active } : m,
      )
      await saveMocks(updated)
      setMocks(updated)

      // Ensure link is installed when activating a mock
      const hasActiveMocks = updated.some((m) => m.active)
      if (hasActiveMocks && !linkInstalledRef.current) {
        const installed = await installLink()
        if (installed) {
          syncMocks(updated)
        }
      } else {
        syncMocks(updated)
      }
    },
    [mocks, installLink, syncMocks],
  )

  const importMocks = useCallback(
    async (imported: MutationMockDef[]) => {
      const merged = [...mocks, ...imported]
      await saveMocks(merged)
      setMocks(merged)
      syncMocks(merged)
    },
    [mocks, syncMocks],
  )

  const clearLog = useCallback(() => {
    setInterceptedLog([])
  }, [])

  return {
    mocks,
    interceptedLog,
    linkInstalled,
    addMock,
    updateMock,
    deleteMock,
    toggleMock,
    importMocks,
    installLink,
    clearLog,
  }
}
