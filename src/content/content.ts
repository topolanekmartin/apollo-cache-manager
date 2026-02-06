import type { BridgeMessage, RuntimeMessage } from '../shared/messageTypes'

// Relay: page (bridge) → extension (background/panel)
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return
  const data = event.data as BridgeMessage
  if (data?.source !== 'apollo-cache-manager-bridge') return

  const runtimeMsg: RuntimeMessage = {
    source: 'apollo-cache-manager',
    message: data.message,
  }
  chrome.runtime.sendMessage(runtimeMsg)
})

// Relay: extension (background/panel) → page (bridge)
chrome.runtime.onMessage.addListener((msg: RuntimeMessage) => {
  if (msg?.source !== 'apollo-cache-manager') return
  const bridgeMsg: BridgeMessage = {
    source: 'apollo-cache-manager-content',
    message: msg.message,
  }
  window.postMessage(bridgeMsg, '*')
})
