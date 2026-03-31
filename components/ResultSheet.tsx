'use client'
import { AZ } from '@/lib/az'
import type { AnalysisResult } from '@/lib/types'

interface Props {
  business: string
  result: AnalysisResult
  onReset: () => void
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200'
  if (score >= 40) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

export default function ResultSheet({ business, result, onReset }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-2xl p-6 max-h-[72vh] overflow-y-auto animate-slide-up">
      <div className={`flex items-center justify-between mb-2 p-4 rounded-2xl border ${scoreBg(result.score)}`}>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{AZ.RESULT_PROBABILITY}</p>
          <h2 className="text-lg font-bold text-gray-800">{business}</h2>
        </div>
        <span className={`text-5xl font-extrabold ${scoreColor(result.score)}`}>
          {result.score}%
        </span>
      </div>

      <div className="mb-4 mt-4">
        <h3 className="text-sm font-semibold text-green-700 mb-2">{AZ.RESULT_PROS}</h3>
        <ul className="space-y-1.5">
          {result.pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              {pro}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-red-600 mb-2">{AZ.RESULT_CONS}</h3>
        <ul className="space-y-1.5">
          {result.cons.map((con, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-red-400 mt-0.5 shrink-0">✗</span>
              {con}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {AZ.RESULT_VERDICT}
        </h3>
        <p className="text-sm text-gray-700 italic">"{result.verdict}"</p>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        {AZ.RESULT_RESET}
      </button>
    </div>
  )
}
