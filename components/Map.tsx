'use client'
import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/types'

interface MapProps {
  onPinDrop: (lat: number, lng: number) => void
  pin: LatLng | null
  dimmed: boolean
}

const BAKU_CENTER: [number, number] = [40.4093, 49.8671]
const INITIAL_ZOOM = 13

const PIN_ICON = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  className: '',
})

export default function Map({ onPinDrop, pin, dimmed }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const stableDrop = useCallback(onPinDrop, [onPinDrop])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current).setView(BAKU_CENTER, INITIAL_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => stableDrop(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [stableDrop])

  useEffect(() => {
    if (!mapRef.current) return
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
        stableDrop(pos.lat, pos.lng)
      })
      markerRef.current = marker
    }
  }, [pin, stableDrop])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full transition-opacity duration-300 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    />
  )
}
