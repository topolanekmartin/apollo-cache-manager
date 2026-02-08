import type { RuntimeMessage } from '../shared/messageTypes'

// Track which DevTools panels are connected to which tabs
const connections = new Map<number, chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'apollo-cache-manager-panel') return

  const tabId = port.sender?.tab?.id

  port.onMessage.addListener((msg: RuntimeMessage) => {
    const targetTabId = msg.tabId ?? tabId
    if (targetTabId === undefined) return

    // Register connection on first message
    if (!connections.has(targetTabId)) {
      connections.set(targetTabId, port)
    }

    // Forward message from panel to content script
    chrome.tabs.sendMessage(targetTabId, {
      source: 'apollo-cache-manager',
      message: msg.message,
    } satisfies RuntimeMessage).catch(() => {
      // Content script not yet loaded — expected on initial connection
    })
  })

  port.onDisconnect.addListener(() => {
    for (const [tid, p] of connections.entries()) {
      if (p === port) {
        connections.delete(tid)
        break
      }
    }
  })
})

// Forward messages from content script to connected panel
chrome.runtime.onMessage.addListener(
  (msg: RuntimeMessage, sender) => {
    if (msg?.source !== 'apollo-cache-manager') return

    const tabId = sender.tab?.id
    if (tabId === undefined) return

    const port = connections.get(tabId)
    if (port) {
      try {
        port.postMessage(msg)
      } catch {
        connections.delete(tabId)
      }
    }
  },
)
