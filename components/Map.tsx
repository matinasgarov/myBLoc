'use client'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Bus,
  MapPinned,
  Route,
  Store,
  TrainFront,
  TrafficCone,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { LatLng, AgentStatus } from '@/lib/types'
import type { Strings, Lang } from '@/lib/i18n'

type LayerType = 'bus' | 'metro' | 'transport' | 'competitors'

const AGENT_ICONS: Record<string, LucideIcon> = {
  'market-analyst': BarChart3,
  'risk-advisor': AlertTriangle,
  'location-strategist': MapPinned,
  'customer-flow': UsersRound,
  'urban-forecaster': Building2,
  'infrastructure-auditor': Route,
}

const LAYER_ICONS: Record<LayerType, LucideIcon> = {
  bus: Bus,
  metro: TrainFront,
  transport: TrafficCone,
  competitors: Store,
}

function MarketAnalystLogo() {
  return (
    <svg viewBox="0 0 24 24" className="map-custom-logo" aria-hidden="true">
      <defs>
        <linearGradient id="marketAnalystLogoFill" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b1b3f" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="url(#marketAnalystLogoFill)" />
      <path d="M7.5 16.5h9" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 13.5l2.6-2.8 2.1 1.9 3.4-4.2" stroke="#bfdbfe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="8" cy="13.5" r="1" fill="#60a5fa" />
      <circle cx="10.6" cy="10.7" r="1" fill="#60a5fa" />
      <circle cx="12.7" cy="12.6" r="1" fill="#60a5fa" />
      <circle cx="16.1" cy="8.4" r="1" fill="#dbeafe" />
    </svg>
  )
}

function BusLogo() {
  return (
    <svg viewBox="0 0 24 24" className="map-custom-logo" aria-hidden="true">
      <defs>
        <linearGradient id="busLogoFill" x1="5" y1="21" x2="19" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#081a3a" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <rect x="5" y="3.75" width="14" height="15.5" rx="3.2" fill="url(#busLogoFill)" />
      <path d="M8 7h8" stroke="#bfdbfe" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="7.4" y="8.8" width="9.2" height="5.2" rx="1.1" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1" />
      <path d="M8.5 17.2h7" stroke="#93c5fd" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8.7" cy="18.2" r="1.2" fill="#dbeafe" />
      <circle cx="15.3" cy="18.2" r="1.2" fill="#dbeafe" />
    </svg>
  )
}

const LAYER_DEFS = [
  { key: 'bus'         as LayerType, emoji: '🚌', labelEn: 'Bus Stops',   labelAz: 'Avtobus',   color: '#f59e0b' },
  { key: 'metro'       as LayerType, emoji: '🚇', labelEn: 'Metro',       labelAz: 'Metro',     color: '#a855f7' },
  { key: 'transport'   as LayerType, emoji: '🚉', labelEn: 'Transport',   labelAz: 'Nəqliyyat', color: '#10b981' },
  { key: 'competitors' as LayerType, emoji: '🏪', labelEn: 'Competitors', labelAz: 'Rəqiblər',  color: '#ef4444' },
]

const AGENT_DEFS = [
  { key: 'market-analyst',         emoji: '📊', labelEn: 'Market Analyst',         labelAz: 'Bazar Analitiki',       color: '#f59e0b' },
  { key: 'risk-advisor',           emoji: '⚠️', labelEn: 'Risk Advisor',            labelAz: 'Risk Məsləhətçisi',     color: '#ef4444' },
  { key: 'location-strategist',    emoji: '🗺️', labelEn: 'Location Strategist',    labelAz: 'Məkan Strateqi',        color: '#3b82f6' },
  { key: 'customer-flow',          emoji: '🚶', labelEn: 'Customer Flow',           labelAz: 'Müştəri Axını',         color: '#10b981' },
  { key: 'urban-forecaster',       emoji: '🏙️', labelEn: 'Urban Forecaster',       labelAz: 'Şəhər İnkişafı',       color: '#8b5cf6' },
  { key: 'infrastructure-auditor', emoji: '🔧', labelEn: 'Infrastructure Auditor', labelAz: 'İnfrastruktur Auditor', color: '#06b6d4' },
]

const BAKU_CENTER: [number, number] = [40.4093, 49.8671]
const INITIAL_ZOOM = 13

const PIN_ICON = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  className: '',
})

function makeLayerIcon(color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:11px;height:11px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
    className: '',
  })
}

const ALL_LAYERS: LayerType[] = ['bus', 'metro', 'transport', 'competitors']
const INIT_BOOL: Record<LayerType, boolean> = { bus: false, metro: false, transport: false, competitors: false }

interface MapProps {
  onPinDrop: (lat: number, lng: number) => void
  pin: LatLng | null
  dimmed: boolean
  flyToTarget: LatLng | null
  showOverlay?: boolean
  lang?: Lang
  strings?: Strings
  agentStatus?: Record<string, AgentStatus>
  onAgentClick?: (key: string) => void
  businessType?: string
}

export default function Map({ onPinDrop, pin, dimmed, flyToTarget, showOverlay, lang, strings, agentStatus, onAgentClick, businessType }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef(onPinDrop)
  const layerMarkersRef = useRef<Record<LayerType, L.Marker[]>>({ bus: [], metro: [], transport: [], competitors: [] })
  const dragRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const suppressRailClickRef = useRef(false)

  const [activeLayers, setActiveLayers] = useState<Record<LayerType, boolean>>(INIT_BOOL)
  const [layerLoading, setLayerLoading] = useState<Record<LayerType, boolean>>(INIT_BOOL)
  const [railPosition, setRailPosition] = useState<{ left: number; top: number } | null>(null)
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
      if (markerRef.current) map.panTo(markerRef.current.getLatLng())
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
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    if (pin) {
      const marker = L.marker([pin.lat, pin.lng], { icon: PIN_ICON, draggable: true }).addTo(mapRef.current)
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        dropRef.current(pos.lat, pos.lng)
      })
      markerRef.current = marker
      mapRef.current.panTo([pin.lat, pin.lng])
    }
    ALL_LAYERS.forEach(lt => {
      layerMarkersRef.current[lt].forEach(m => m.remove())
      layerMarkersRef.current[lt] = []
    })
    setActiveLayers({ ...INIT_BOOL })
  }, [pin])

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return
    mapRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], 17, { duration: 1.2 })
  }, [flyToTarget])

  // Stop Leaflet from receiving rail events. Without this, button mousedown
  // is interpreted by Leaflet as the start of a map-pan, and on mouseup the
  // map-pan never finalizes — leaving the map's drag handler stuck "open"
  // until you manage to click somewhere off the rail. Also prevents click
  // events from reaching the map and dropping a new pin.
  useEffect(() => {
    if (!showOverlay || !pin || !railRef.current) return
    const el = railRef.current
    L.DomEvent.disableClickPropagation(el)
    L.DomEvent.disableScrollPropagation(el)
    L.DomEvent.on(el, 'mousedown pointerdown touchstart', L.DomEvent.stopPropagation)
  }, [showOverlay, pin])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggleLayer = async (layerKey: LayerType) => {
    if (!pin || !mapRef.current) return
    if (activeLayers[layerKey]) {
      layerMarkersRef.current[layerKey].forEach(m => m.remove())
      layerMarkersRef.current[layerKey] = []
      setActiveLayers(prev => ({ ...prev, [layerKey]: false }))
      return
    }
    setLayerLoading(prev => ({ ...prev, [layerKey]: true }))
    try {
      const res = await fetch('/api/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, layerType: layerKey, businessType: businessType ?? '' }),
      })
      const data = await res.json() as { elements: { lat: number; lng: number; name?: string }[] }
      if (!data.elements?.length) {
        const def = LAYER_DEFS.find(l => l.key === layerKey)!
        showToast(lang === 'az' ? `${def.labelAz}: nəticə yoxdur` : `${def.labelEn}: no results found`)
        return
      }
      const def = LAYER_DEFS.find(l => l.key === layerKey)!
      const icon = makeLayerIcon(def.color)
      const markers = data.elements.map(el => {
        const m = L.marker([el.lat, el.lng], { icon })
        if (el.name) m.bindTooltip(el.name, { permanent: false })
        m.addTo(mapRef.current!)
        return m
      })
      layerMarkersRef.current[layerKey] = markers
      setActiveLayers(prev => ({ ...prev, [layerKey]: true }))
    } catch {
      showToast(lang === 'az' ? 'Xəta baş verdi' : 'An error occurred')
    } finally {
      setLayerLoading(prev => ({ ...prev, [layerKey]: false }))
    }
  }

  const handleRailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !railRef.current) return
    if (event.button !== 0) return

    // Only drag from the grip handle — button clicks must not be captured
    const grip = railRef.current.querySelector('.map-tool-grip')
    if (!grip || !grip.contains(event.target as Node)) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const railRect = railRef.current.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - railRect.left,
      offsetY: event.clientY - railRect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    setRailPosition({
      left: railRect.left - containerRect.left,
      top: railRect.top - containerRect.top,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleRailPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !containerRef.current || !railRef.current || drag.pointerId !== event.pointerId) return

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (distance > 4) drag.moved = true

    const containerRect = containerRef.current.getBoundingClientRect()
    const railRect = railRef.current.getBoundingClientRect()
    const nextLeft = event.clientX - containerRect.left - drag.offsetX
    const nextTop = event.clientY - containerRect.top - drag.offsetY

    setRailPosition({
      left: Math.min(Math.max(8, nextLeft), containerRect.width - railRect.width - 8),
      top: Math.min(Math.max(8, nextTop), containerRect.height - railRect.height - 8),
    })
  }

  const handleRailPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      suppressRailClickRef.current = true
      window.setTimeout(() => {
        suppressRailClickRef.current = false
      }, 0)
    }
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleRailClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressRailClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden transition-opacity duration-300 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
      />

      {showOverlay && pin && (
        <div
          ref={railRef}
          className="map-tool-rail"
          onPointerDown={handleRailPointerDown}
          onPointerMove={handleRailPointerMove}
          onPointerUp={handleRailPointerUp}
          onPointerCancel={handleRailPointerUp}
          onClickCapture={handleRailClickCapture}
          style={{
          position: 'absolute',
          top: railPosition ? railPosition.top : 12,
          left: railPosition ? railPosition.left : undefined,
          right: railPosition ? undefined : 12,
          zIndex: 1000,
          background: 'rgba(7,9,13,0.88)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: 6,
          width: 46,
          maxHeight: 'calc(100% - 24px)',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 5,
          touchAction: 'none',
        }}>
          <div className="map-tool-grip" aria-label={lang === 'az' ? 'Paneli surusdur' : 'Drag toolbar'}>
            <span />
            <span />
            <span />
          </div>

          {/* Agent buttons */}
          <div>
            <p style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(100,116,139,0.5)', margin: '0 0 5px', fontWeight: 600 }}>
              {strings?.EXPERT_PANEL_TITLE ?? 'Expert Agents'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {AGENT_DEFS.map(agent => {
                const status = agentStatus?.[agent.key] ?? 'idle'
                const label = lang === 'az' ? agent.labelAz : agent.labelEn
                const isDone = status === 'done'
                const isLoading = status === 'loading'
                const isErr = status === 'error'
                const Icon = AGENT_ICONS[agent.key]
                return (
                  <button
                    key={agent.key}
                    onClick={() => onAgentClick?.(agent.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 7px', borderRadius: 6,
                      cursor: isLoading ? 'wait' : 'pointer', width: '100%', textAlign: 'left',
                      background: isDone ? `${agent.color}18` : isLoading ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${isDone ? agent.color + '45' : isErr ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.055)'}`,
                      color: isDone ? agent.color : isErr ? '#f87171' : isLoading ? 'rgba(203,213,225,0.7)' : 'rgba(148,163,184,0.6)',
                      fontSize: 10, fontWeight: isDone ? 600 : 400, transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 10 }}>
                      {agent.key === 'market-analyst' ? <MarketAnalystLogo /> : <Icon size={16} strokeWidth={1.9} />}
                    </span>
                    <span style={{ flex: 1, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{label}</span>
                    <span style={{ fontSize: 9, width: 12, textAlign: 'center', flexShrink: 0, fontFamily: 'monospace', opacity: 0.7 }}>
                      {isLoading ? '…' : isDone ? '✓' : isErr ? '!' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Layer buttons */}
          <div>
            <p style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(100,116,139,0.5)', margin: '0 0 5px', fontWeight: 600 }}>
              {lang === 'az' ? 'Xəritə Layları' : 'Map Layers'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {LAYER_DEFS.map(layer => {
                const isActive = activeLayers[layer.key]
                const isLoad = layerLoading[layer.key]
                const label = lang === 'az' ? layer.labelAz : layer.labelEn
                const Icon = LAYER_ICONS[layer.key]
                return (
                  <button key={layer.key} onClick={() => toggleLayer(layer.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 7px', borderRadius: 6,
                    cursor: isLoad ? 'wait' : 'pointer', textAlign: 'left', width: '100%',
                    background: isActive ? `${layer.color}18` : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isActive ? layer.color + '45' : 'rgba(255,255,255,0.055)'}`,
                    color: isActive ? layer.color : 'rgba(148,163,184,0.55)',
                    fontSize: 10, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 10 }}>
                      {layer.key === 'bus' ? <BusLogo /> : <Icon size={16} strokeWidth={1.9} />}
                    </span>
                    <span style={{ flex: 1 }}>{label}</span>
                    {isLoad && <span style={{ fontSize: 9, fontFamily: 'monospace', opacity: 0.7 }}>…</span>}
                    {isActive && !isLoad && <span style={{ width: 5, height: 5, borderRadius: '50%', background: layer.color, flexShrink: 0, display: 'inline-block' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1001,
          background: 'rgba(7,9,13,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: '7px 16px',
          fontSize: 12,
          color: 'rgba(203,213,225,0.85)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
