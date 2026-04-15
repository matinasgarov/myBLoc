'use client'

import { cn } from '@/lib/utils'

export interface BentoItem {
  title: string
  description: string
  icon: React.ReactNode
  status?: string
  tags?: string[]
  meta?: string
  cta?: string
  colSpan?: number
  hasPersistentHover?: boolean
}

interface BentoGridProps {
  items: BentoItem[]
}

export function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 max-w-5xl mx-auto">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'group relative p-5 rounded-2xl overflow-hidden transition-all duration-300',
            'border border-slate-700/50 bg-slate-800/40',
            'hover:shadow-[0_2px_16px_rgba(255,255,255,0.04)]',
            'hover:-translate-y-0.5 will-change-transform',
            item.colSpan === 2 ? 'md:col-span-2' : 'col-span-1',
            {
              'shadow-[0_2px_16px_rgba(255,255,255,0.04)] -translate-y-0.5':
                item.hasPersistentHover,
            }
          )}
        >
          {/* Dot grid texture on hover */}
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              item.hasPersistentHover
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          <div className="relative flex flex-col space-y-3">
            {/* Top row: icon + status badge */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/8 group-hover:bg-white/12 transition-all duration-300">
                {item.icon}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-lg bg-white/8 text-slate-300 transition-colors duration-300 group-hover:bg-white/15">
                {item.status ?? 'Aktiv'}
              </span>
            </div>

            {/* Title + meta + description */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-slate-100 tracking-tight text-[15px]">
                {item.title}
                {item.meta && (
                  <span className="ml-2 text-xs text-slate-500 font-normal">
                    {item.meta}
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-400 leading-snug">
                {item.description}
              </p>
            </div>

            {/* Tags + CTA */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-wrap gap-1.5">
                {item.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-md bg-white/8 text-slate-400 hover:bg-white/14 transition-colors duration-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                {item.cta ?? 'Ətraflı →'}
              </span>
            </div>
          </div>

          {/* Gradient border glow on hover */}
          <div
            className={cn(
              'absolute inset-0 -z-10 rounded-2xl p-px bg-gradient-to-br from-transparent via-white/8 to-transparent transition-opacity duration-300',
              item.hasPersistentHover
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            )}
          />
        </div>
      ))}
    </div>
  )
}
