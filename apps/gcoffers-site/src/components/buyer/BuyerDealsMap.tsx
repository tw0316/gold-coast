'use client'

import { type CSSProperties, type SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react'

import type { BuyerPublicDeal } from '@/lib/deals/dealView'

const TILE_SIZE = 256
const ZOOM = 9
const TILE_GRID_SIZE = TILE_SIZE * 3
// This is a lightweight static approximation, not a full slippy map: center a fixed 3x3
// USGS tile grid and clamp pins into the visible frame.
const DEFAULT_CENTER = { latitude: 26.1901, longitude: -80.3659 } as const

type BuyerDealsMapProps = {
  activeDealId: string | null
  deals: BuyerPublicDeal[]
  onDealHover: (dealId: string | null) => void
  onDealSelect: (dealId: string | null) => void
  selectedDealId: string | null
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  notation: 'compact',
  style: 'currency',
})

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const project = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const scale = TILE_SIZE * 2 ** ZOOM
  const sinLatitude = Math.sin((latitude * Math.PI) / 180)

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale,
  }
}

const formatMapPrice = (deal: BuyerPublicDeal): string => {
  const price = deal.financials.askingPrice ?? deal.financials.closedPrice
  return typeof price === 'number' && Number.isFinite(price) ? moneyFormatter.format(price) : 'Deal'
}

const locationKey = (deal: BuyerPublicDeal): string =>
  `${deal.mapLocation.latitude.toFixed(5)},${deal.mapLocation.longitude.toFixed(5)}`

const buildMapPoint = (
  deal: BuyerPublicDeal,
  center: ReturnType<typeof project>,
  duplicateIndex: number,
  duplicateCount: number,
) => {
  const point = project(deal.mapLocation)
  const duplicateOffset = duplicateCount > 1 ? duplicateIndex - (duplicateCount - 1) / 2 : 0
  const left = clamp(50 + ((point.x - center.x) / TILE_GRID_SIZE) * 100 + duplicateOffset * 1.2, 8, 92)
  const top = clamp(50 + ((point.y - center.y) / TILE_GRID_SIZE) * 100 + duplicateOffset * 0.9, 8, 92)

  return { left, top }
}

type MapTile = {
  key: string
  left: number
  loading: 'eager' | 'lazy'
  src: string
  top: number
}

type TileStatus = {
  attempted: Set<string>
  failed: Set<string>
  tileSetKey: string
}

const emptyTileStatus = (tileSetKey = ''): TileStatus => ({
  attempted: new Set(),
  failed: new Set(),
  tileSetKey,
})

type MapPin = {
  deal: BuyerPublicDeal
  left: number
  top: number
}

const buildTiles = (centerPoint: ReturnType<typeof project>, centerTileX: number, centerTileY: number): MapTile[] =>
  [-1, 0, 1].flatMap((rowOffset) =>
    [-1, 0, 1].map((columnOffset) => {
      const tileX = centerTileX + columnOffset
      const tileY = centerTileY + rowOffset
      const left = ((TILE_SIZE * 1.5 + tileX * TILE_SIZE - centerPoint.x) / TILE_GRID_SIZE) * 100
      const top = ((TILE_SIZE * 1.5 + tileY * TILE_SIZE - centerPoint.y) / TILE_GRID_SIZE) * 100

      return {
        key: `${tileX}-${tileY}`,
        left,
        loading: rowOffset === 0 && columnOffset === 0 ? 'eager' : 'lazy',
        src: `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/${ZOOM}/${tileY}/${tileX}`,
        top,
      }
    }),
  )

const buildPins = (mappedDeals: BuyerPublicDeal[], centerPoint: ReturnType<typeof project>): MapPin[] => {
  const duplicateCounts = mappedDeals.reduce((counts, deal) => {
    const key = locationKey(deal)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    return counts
  }, new Map<string, number>())
  const duplicateSeen = new Map<string, number>()

  return mappedDeals.flatMap((deal) => {
    const key = locationKey(deal)
    const duplicateIndex = duplicateSeen.get(key) ?? 0
    duplicateSeen.set(key, duplicateIndex + 1)
    const mapPoint = buildMapPoint(deal, centerPoint, duplicateIndex, duplicateCounts.get(key) ?? 1)

    return [{ deal, ...mapPoint }]
  })
}

export function BuyerDealsMap({ activeDealId, deals, onDealHover, onDealSelect, selectedDealId }: BuyerDealsMapProps) {
  const [tileStatus, setTileStatus] = useState<TileStatus>(() => emptyTileStatus())
  const { pins, tiles } = useMemo(() => {
    const centerLocation = deals.length > 0
      ? {
          latitude: deals.reduce((sum, deal) => sum + deal.mapLocation.latitude, 0) / deals.length,
          longitude: deals.reduce((sum, deal) => sum + deal.mapLocation.longitude, 0) / deals.length,
        }
      : DEFAULT_CENTER
    const centerPoint = project(centerLocation)
    const centerTileX = Math.floor(centerPoint.x / TILE_SIZE)
    const centerTileY = Math.floor(centerPoint.y / TILE_SIZE)

    return {
      pins: buildPins(deals, centerPoint),
      tiles: buildTiles(centerPoint, centerTileX, centerTileY),
    }
  }, [deals])
  const tileSetKey = useMemo(() => tiles.map((tile) => tile.key).join('|'), [tiles])
  const eagerTiles = tileStatus.tileSetKey === tileSetKey && tileStatus.failed.size > 0
  const allTilesFailed = useMemo(() => {
    if (tileStatus.tileSetKey !== tileSetKey) {
      return false
    }

    const currentTileKeys = new Set(tiles.map((tile) => tile.key))
    const attemptedCurrentTileKeys = [...tileStatus.attempted].filter((tileKey) => currentTileKeys.has(tileKey))

    return tiles.length > 0 && attemptedCurrentTileKeys.length === tiles.length && attemptedCurrentTileKeys.every((tileKey) => tileStatus.failed.has(tileKey))
  }, [tileSetKey, tileStatus, tiles])

  useEffect(() => {
    setTileStatus((current) => (current.tileSetKey === tileSetKey ? current : emptyTileStatus(tileSetKey)))
  }, [tileSetKey])

  const handleTileError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const tileKey = event.currentTarget.dataset.tileKey

    if (!tileKey) {
      return
    }

    setTileStatus((current) => {
      if (current.tileSetKey !== tileSetKey) {
        return current
      }

      const attempted = new Set(current.attempted)
      const failed = new Set(current.failed)
      const alreadyAttempted = attempted.has(tileKey)
      const alreadyFailed = failed.has(tileKey)

      if (alreadyAttempted && alreadyFailed) {
        return current
      }

      attempted.add(tileKey)
      failed.add(tileKey)

      return { attempted, failed, tileSetKey }
    })
  }, [tileSetKey])

  const handleTileLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const tileKey = event.currentTarget.dataset.tileKey

    if (!tileKey) {
      return
    }

    setTileStatus((current) => {
      if (current.tileSetKey !== tileSetKey) {
        return current
      }

      const attempted = new Set(current.attempted)
      const failed = new Set(current.failed)
      const alreadyAttempted = attempted.has(tileKey)
      const failedHasTile = failed.has(tileKey)

      if (alreadyAttempted && !failedHasTile) {
        return current
      }

      attempted.add(tileKey)
      failed.delete(tileKey)

      return { attempted, failed, tileSetKey }
    })
  }, [tileSetKey])

  return (
    <div className="map-card buyer-real-map" aria-label="Map of active South Florida deals">
      <div className="buyer-real-map__tiles" aria-hidden="true">
        {tiles.map((tile) => (
          <img
            alt=""
            className="buyer-real-map__tile"
            data-tile-key={tile.key}
            key={tile.key}
            loading={eagerTiles ? 'eager' : tile.loading}
            onError={handleTileError}
            onLoad={handleTileLoad}
            src={tile.src}
            style={{
              '--tile-left': `${tile.left}%`,
              '--tile-top': `${tile.top}%`,
            } as CSSProperties}
          />
        ))}
      </div>
      {allTilesFailed ? (
        <div className="buyer-real-map__tile-fallback" role="status">
          Map tiles are temporarily unavailable. Deal pins are still shown.
        </div>
      ) : null}
      <div className="buyer-real-map__pins" aria-label="Deal map pins">
        {pins.map(({ deal, left, top }) => {
          return (
            <button
              aria-label={`${formatMapPrice(deal)} at ${deal.locationLabel ?? deal.title}`}
              aria-pressed={selectedDealId === deal.id}
              className="buyer-map-pin"
              data-hovered={activeDealId === deal.id && selectedDealId !== deal.id ? 'true' : undefined}
              key={deal.id}
              onBlur={() => onDealHover(null)}
              onClick={() => onDealSelect(selectedDealId === deal.id ? null : deal.id)}
              onFocus={() => onDealHover(deal.id)}
              onMouseEnter={() => onDealHover(deal.id)}
              onMouseLeave={() => onDealHover(null)}
              style={{
                '--pin-left': `${left}%`,
                '--pin-top': `${top}%`,
              } as CSSProperties}
              type="button"
            >
              <span>{formatMapPrice(deal)}</span>
              {deal.mapLocation.source === 'county-fallback' ? <small>Approx.</small> : null}
            </button>
          )
        })}
      </div>
      <div className="buyer-real-map__copy">
        <strong>Live deal map</strong>
        <p>{deals.length} active pin{deals.length === 1 ? '' : 's'} shown on USGS National Map tiles.</p>
      </div>
      <div className="buyer-real-map__attribution">
        <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" rel="noreferrer" target="_blank">
          Tiles: U.S. Geological Survey, The National Map
        </a>
      </div>
    </div>
  )
}
