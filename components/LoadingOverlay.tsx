'use client'
import { AZ } from '@/lib/az'

interface Props {
  step: 1 | 2 | 3 | 4
}

const STEPS = [
  AZ.LOADING_STEP_1,
  AZ.LOADING_STEP_2,
  AZ.LOADING_STEP_3,
  AZ.LOADING_STEP_4,
]

export default function LoadingOverlay({ step }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="flex flex-col gap-2.5 text-sm min-w-[240px]">
          {STEPS.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4
            const isDone = step > stepNum
            const isActive = step === stepNum
            return (
              <div
                key={stepNum}
                className={`flex items-center gap-2 transition-colors ${
                  isDone ? 'text-gray-400' : isActive ? 'text-blue-600 font-medium' : 'text-gray-300'
                }`}
              >
                <span className="w-4 text-center shrink-0">
                  {isDone ? '✓' : isActive ? '·' : '·'}
                </span>
                <span>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
