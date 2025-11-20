import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve o endpoint WebSocket considerando overrides via env (host, porta ou URL completa).
 */
export function resolveWebSocketUrl(token: string) {
  const explicitUrl = import.meta.env.VITE_WS_URL?.trim()
  if (explicitUrl) {
    const normalized = explicitUrl.replace(/\/$/, '')
    const separator = normalized.includes('?') ? '&' : '?'
    return `${normalized}${separator}token=${token}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = (import.meta.env.VITE_WS_HOST ?? window.location.hostname).trim()
  const port = (import.meta.env.VITE_WS_PORT ?? '5001').trim()
  const authority = host.includes(':') || port === '' ? host : `${host}:${port}`
  return `${protocol}//${authority}/ws?token=${token}`
}
