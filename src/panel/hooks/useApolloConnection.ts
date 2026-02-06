import { useState, useEffect, useCallback } from 'react'
import { MSG } from '../../shared/messageTypes'
import type { ApolloDetectedMessage } from '../../shared/messageTypes'
import { sendAndWait, onMessage } from '../utils/messaging'

interface ApolloConnectionState {
  detected: boolean
  clientCount: number
  checking: boolean
}

export function useApolloConnection() {
  const [state, setState] = useState<ApolloConnectionState>({
    detected: false,
    clientCount: 0,
    checking: true,
  })

  const detect = useCallback(async () => {
    setState((prev) => ({ ...prev, checking: true }))
    try {
      const result = await sendAndWait<ApolloDetectedMessage>(
        { type: MSG.DETECT_APOLLO },
        MSG.APOLLO_DETECTED,
        3000,
      )
      setState({
        detected: result.payload.detected,
        clientCount: result.payload.clientCount,
        checking: false,
      })
    } catch {
      setState({ detected: false, clientCount: 0, checking: false })
    }
  }, [])

  useEffect(() => {
    detect()

    // Also listen for unsolicited detection updates
    const cleanup = onMessage((msg) => {
      if (msg.type === MSG.APOLLO_DETECTED) {
        setState({
          detected: msg.payload.detected,
          clientCount: msg.payload.clientCount,
          checking: false,
        })
      }
    })

    // Poll periodically in case Apollo loads after page
    const interval = setInterval(detect, 5000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [detect])

  return { ...state, retry: detect }
}
