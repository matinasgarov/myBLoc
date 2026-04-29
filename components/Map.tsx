'use client'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/types'
import type { Strings } from '@/lib/i18n'

type LayerType = 'bus' | 'metro' | 'transport' | 'competitors'

interface MapProps {
  onPinDrop: (lat: number, lng: number) => void
  pin: LatLng | null
  dimmed: boolean
  flyToTarget: LatLng | null
  showLayerPanel?: boolean
  businessType?: string
  strings?: Strings
}

const BAKU_CENTER: [number, number] = [40.4093, 49.8671]
const INITIAL_ZOOM = 13

const PIN_ICON = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  className: '',
})

const LAYER_COLORS: Record<LayerType, string> = {
  bus: '#f59e0b',
  metro: '#a855f7',
  transport: '#10b981',
  competitors: '#ef4444',
}

const LAYER_DEFS: { type: LayerType; stringKey: keyof Strings; emoji: string }[] = [
  { type: 'bus',         stringKey: 'LAYER_BUS',         emoji: '🚌' },
  { type: 'metro',       stringKey: 'LAYER_METRO',        emoji: '🚇' },
  { type: 'transport',   stringKey: 'LAYER_TRANSPORT',    emoji: '🚦' },
  { type: 'competitors', stringKey: 'LAYER_COMPETITORS',  emoji: '🏪' },
]

// Fallback labels when strings prop is absent
const LAYER_LABELS: Record<LayerType, string> = {
  bus: 'Bus Stops',
  metro: 'Metro',
  transport: 'Transport',
  competitors: 'Competitors',
}

const ALL_LAYER_TYPES: LayerType[] = ['bus', 'metro', 'transport', 'competitors']

function makeLayerIcon(type: LayerType): L.DivIcon {
  const color = LAYER_COLORS[type]
  return L.divIcon({
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
  })
}

const INITIAL_ACTIVE: Record<LayerType, boolean> = { bus: false, metro: false, transport: false, competitors: false }
const INITIAL_LOADING: Record<LayerType, boolean> = { bus: false, metro: false, transport: false, competitors: false }

export default function Map({ onPinDrop, pin, dimmed, flyToTarget, showLayerPanel, businessType, strings }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef(onPinDrop)
  const layerMarkersRef = useRef<Record<LayerType, L.Marker[]>>({
    bus: [], metro: [], transport: [], competitors: [],
  })

  const [activeLayers, setActiveLayers] = useState<Record<LayerType, boolean>>(INITIAL_ACTIVE)
  const [layerLoading, setLayerLoading] = useState<Record<LayerType, boolean>>(INITIAL_LOADING)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { dropRef.current = onPinDrop }, [onPinDrop])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current).setView(BAKU_CENTER, INITIAL_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => dropRef.current(e.latlng.lat, e.latlng.lng))
    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
      if (markerRef.current) {
        map.panTo(markerRef.current.getLatLng())
      }
    })
    resizeObserver.observe(containerRef.current!)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    // Clear all layer markers when pin moves
    ALL_LAYER_TYPES.forEach(t => {
      layerMarkersRef.current[t].forEach(m => m.remove())
      layerMarkersRef.current[t] = []
    })
    setActiveLayers({ ...INITIAL_ACTIVE })

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    if (pin) {
      const marker = L.marker([pin.lat, pin.lng], { icon: PIN_ICON, draggable: true }).addTo(
        mapRef.current
      )
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        dropRef.current(pos.lat, pos.lng)
      })
      markerRef.current = marker
      mapRef.current.panTo([pin.lat, pin.lng])
    }
  }, [pin])

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return
    mapRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], 17, { duration: 1.2 })
  }, [flyToTarget])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleLayer(type: LayerType) {
    if (activeLayers[type]) {
      layerMarkersRef.current[type].forEach(m => m.remove())
      layerMarkersRef.current[type] = []
      setActiveLayers(prev => ({ ...prev, [type]: false }))
      return
    }
    if (!pin || !mapRef.current) return
    setLayerLoading(prev => ({ ...prev, [type]: true }))
    try {
      const res = await fetch('/api/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, layerType: type, businessType }),
      })
      const data = await res.json()
      const elements: { lat: number; lng: number }[] = data.elements ?? []
      if (elements.length === 0) {
        const def = LAYER_DEFS.find(d => d.type === type)!
        const label = strings ? strings[def.stringKey] : LAYER_LABELS[type]
        showToast(`${label}: 0`)
        return
      }
      const map = mapRef.current
      if (!map) return
      const icon = makeLayerIcon(type)
      const markers = elements.map(el => L.marker([el.lat, el.lng], { icon }).addTo(map))
      layerMarkersRef.current[type] = markers
      setActiveLayers(prev => ({ ...prev, [type]: true }))
    } catch {
      showToast('Could not load layer data')
    } finally {
      setLayerLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden transition-opacity duration-300 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
      />

      {/* Layer toggle panel */}
      {showLayerPanel && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {LAYER_DEFS.map(({ type, stringKey, emoji }) => {
            const label = strings ? strings[stringKey] : LAYER_LABELS[type]
            const isActive = activeLayers[type]
            const isLoading = layerLoading[type]
            const c = LAYER_COLORS[type]
            return (
              <button
                key={type}
                onClick={() => toggleLayer(type)}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${c}f0 0%, ${c}c0 100%)`
                    : 'linear-gradient(135deg, rgba(15,20,28,0.78) 0%, rgba(7,9,13,0.78) 100%)',
                  border: `1px solid ${isActive ? `${c}` : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: isActive
                    ? `0 4px 14px ${c}55, 0 0 0 1px ${c}40, inset 0 1px 0 rgba(255,255,255,0.15)`
                    : '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backdropFilter: 'blur(12px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease',
                  minWidth: 140,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  transform: isActive ? 'translateY(-0.5px)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.transform = 'none'
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'rgba(255,255,255,0.18)' : `${c}1f`,
                  fontSize: 11,
                }}>{emoji}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {isLoading ? (
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin-arc 0.8s linear infinite',
                  }} />
                ) : (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isActive ? '#fff' : `${c}66`,
                    boxShadow: isActive ? `0 0 6px rgba(255,255,255,0.8)` : 'none',
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%',
          transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(7,9,13,0.92)', color: 'rgba(226,232,240,0.9)',
          padding: '8px 16px', borderRadius: 8, fontSize: 13,
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </>
  )
}
