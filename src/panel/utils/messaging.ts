import { MSG } from '../../shared/messageTypes'
import type { ExtensionMessage, RuntimeMessage } from '../../shared/messageTypes'

let port: chrome.runtime.Port | null = null
const listeners = new Set<(msg: ExtensionMessage) => void>()

function getPort(): chrome.runtime.Port {
  if (!port) {
    port = chrome.runtime.connect({ name: 'apollo-cache-manager-panel' })
    port.onMessage.addListener((msg: RuntimeMessage) => {
      if (msg?.source !== 'apollo-cache-manager') return
      for (const listener of listeners) {
        listener(msg.message)
      }
    })
    port.onDisconnect.addListener(() => {
      port = null
    })
  }
  return port
}

export function sendMessage(message: ExtensionMessage) {
  const runtimeMsg: RuntimeMessage = {
    source: 'apollo-cache-manager',
    tabId: chrome.devtools.inspectedWindow.tabId,
    message,
  }
  getPort().postMessage(runtimeMsg)
}

export function onMessage(listener: (msg: ExtensionMessage) => void): () => void {
  listeners.add(listener)
  // Ensure port is connected
  getPort()
  return () => {
    listeners.delete(listener)
  }
}

export function sendAndWait<T extends ExtensionMessage>(
  message: ExtensionMessage,
  responseType: MSG,
  timeoutMs = 10000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let cleanup: (() => void) | undefined

    const timer = setTimeout(() => {
      cleanup?.()
      reject(new Error(`Timeout waiting for ${responseType}`))
    }, timeoutMs)

    cleanup = onMessage((msg) => {
      if (msg.type === responseType) {
        clearTimeout(timer)
        cleanup?.()
        resolve(msg as T)
      }
    })

    sendMessage(message)
  })
}
