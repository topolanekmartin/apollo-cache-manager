import { type FC, useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

export const Toast: FC<ToastProps> = ({ message, onDone, duration = 3000 }) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 200) // allow fade-out
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDone])

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded bg-panel-success text-panel-bg text-sm font-medium shadow-lg transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>
  )
}
