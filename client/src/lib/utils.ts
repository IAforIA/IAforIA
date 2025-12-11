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
    return `${normalized}${separator}token=${encodeURIComponent(token)}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const hostEnv = import.meta.env.VITE_WS_HOST?.trim()
  const portEnv = import.meta.env.VITE_WS_PORT?.trim()

  // Prefer same-origin host:port when nenhum override foi definido
  const authority = hostEnv
    ? (portEnv && !hostEnv.includes(':') ? `${hostEnv}:${portEnv}` : hostEnv)
    : window.location.host

  return `${protocol}//${authority}/ws?token=${encodeURIComponent(token)}`
}
