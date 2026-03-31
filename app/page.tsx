'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AZ } from '@/lib/az'
import { saveAnalysis, getAnalyses } from '@/lib/storage'
import BusinessInputModal from '@/components/BusinessInputModal'
import LoadingOverlay from '@/components/LoadingOverlay'
import ResultSheet from '@/components/ResultSheet'
import HistorySidebar from '@/components/HistorySidebar'
import type { AnalysisResult, LatLng, SavedAnalysis } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type AppState = 'map' | 'input' | 'loading' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('map')
  const [pin, setPin] = useState<LatLng | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loadingStep, setLoadingStep] = useState<1 | 2>(1)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])

  useEffect(() => {
    setAnalyses(getAnalyses())
  }, [])

  const handlePinDrop = useCallback(
    (lat: number, lng: number) => {
      if (appState !== 'map') return
      setPin({ lat, lng })
      setError(null)
      setAppState('input')
    },
    [appState]
  )

  const handleBusinessSubmit = async (business: string) => {
    if (!pin) return
    setBusinessType(business)
    setAppState('loading')
    setLoadingStep(1)
    setError(null)

    try {
      const placesRes = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business }),
      })
      if (!placesRes.ok) throw new Error('places')
      setLoadingStep(2)
      const placesContext = await placesRes.json()

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin.lat, lng: pin.lng, businessType: business, placesContext }),
      })
      if (!analyzeRes.ok) throw new Error('analyze')

      const analysisResult: AnalysisResult = await analyzeRes.json()
      setResult(analysisResult)
      setAppState('result')

      const saved: SavedAnalysis = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        lat: pin.lat,
        lng: pin.lng,
        business,
        ...analysisResult,
      }
      saveAnalysis(saved)
      setAnalyses(getAnalyses())
    } catch (err) {
      const msg =
        (err as Error).message === 'places' ? AZ.ERROR_NO_DATA : AZ.ERROR_ANALYSIS_FAILED
      setError(msg)
      setAppState('map')
    }
  }

  const handleReset = () => {
    setAppState('map')
    setPin(null)
    setResult(null)
    setBusinessType('')
    setError(null)
  }

  const isDimmed = appState === 'loading' || appState === 'result'

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Map onPinDrop={handlePinDrop} pin={pin} dimmed={isDimmed} />

      {appState === 'map' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-gray-600 shadow-md pointer-events-none select-none">
          {AZ.MAP_INSTRUCTION}
        </div>
      )}

      {error && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl shadow-md max-w-xs text-center">
          {error}
        </div>
      )}

      {appState === 'input' && (
        <BusinessInputModal onSubmit={handleBusinessSubmit} onClose={handleReset} />
      )}

      {appState === 'loading' && <LoadingOverlay step={loadingStep} />}

      {appState === 'result' && result && (
        <ResultSheet business={businessType} result={result} onReset={handleReset} />
      )}

      <button
        onClick={() => setShowHistory((h) => !h)}
        title={AZ.HISTORY_BUTTON_LABEL}
        className="absolute top-4 right-4 z-[999] bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow text-lg"
      >
        🕐
      </button>

      {showHistory && (
        <HistorySidebar analyses={analyses} onClose={() => setShowHistory(false)} />
      )}
    </main>
  )
}
