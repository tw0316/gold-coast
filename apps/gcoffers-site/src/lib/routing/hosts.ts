export type SiteSurface = 'seller' | 'buyer'

const BUYER_LOCAL_HOSTS = new Set(['buyer.localhost'])

export function normalizeHost(host: string | null | undefined): string {
  const firstForwardedHost = host?.split(',')[0]?.trim().toLowerCase() ?? ''
  return firstForwardedHost.replace(/:\d+$/, '')
}

export function getSurfaceForHost(host: string | null | undefined): SiteSurface {
  const normalizedHost = normalizeHost(host)

  if (BUYER_LOCAL_HOSTS.has(normalizedHost)) {
    return 'buyer'
  }

  return 'seller'
}

export function isBuyerHost(host: string | null | undefined): boolean {
  return getSurfaceForHost(host) === 'buyer'
}
