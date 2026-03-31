'use client'
import { AZ } from '@/lib/az'
import type { SavedAnalysis } from '@/lib/types'

interface Props {
  analyses: SavedAnalysis[]
  onClose: () => void
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-green-100 text-green-700'
      : score >= 40
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{score}%</span>
}

export default function HistorySidebar({ analyses, onClose }: Props) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 z-[1000] bg-white shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-800 text-sm">{AZ.HISTORY_TITLE}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {analyses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-10">{AZ.HISTORY_EMPTY}</p>
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li key={a.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-800 text-sm">{a.business}</span>
                  <ScoreBadge score={a.score} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                </p>
                <p className="text-xs text-gray-400">{a.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
