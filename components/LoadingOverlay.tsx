'use client'
import { AZ } from '@/lib/az'

interface Props {
  step: 1 | 2
}

export default function LoadingOverlay({ step }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="flex flex-col gap-2 text-sm min-w-[200px]">
          <div
            className={`flex items-center gap-2 ${
              step >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'
            }`}
          >
            <span className="w-4 text-center">{step > 1 ? '✓' : '·'}</span>
            <span>{AZ.LOADING_STEP_1}</span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              step === 2 ? 'text-blue-600 font-medium' : 'text-gray-400'
            }`}
          >
            <span className="w-4 text-center">·</span>
            <span>{AZ.LOADING_STEP_2}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
