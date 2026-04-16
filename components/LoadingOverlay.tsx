'use client'
import { getStrings } from '@/lib/i18n'

type Strings = ReturnType<typeof getStrings>

interface Props {
  step: 1 | 2 | 3 | 4
  strings: Strings
}

export default function LoadingOverlay({ step, strings }: Props) {
  const STEPS = [
    strings.LOADING_STEP_1,
    strings.LOADING_STEP_2,
    strings.LOADING_STEP_3,
    strings.LOADING_STEP_4,
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-5">
        <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="flex flex-col gap-3 text-sm min-w-[220px]">
          {STEPS.map((label, i) => {
            const stepNum = (i + 1) as 1 | 2 | 3 | 4
            const isDone = step > stepNum
            const isActive = step === stepNum
            return (
              <div
                key={stepNum}
                className={`flex items-center gap-2.5 transition-colors ${
                  isDone
                    ? 'text-slate-600'
                    : isActive
                    ? 'text-emerald-400 font-medium'
                    : 'text-slate-700'
                }`}
              >
                <span className="w-4 text-center shrink-0 text-xs">
                  {isDone ? '✓' : isActive ? '▸' : '·'}
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
