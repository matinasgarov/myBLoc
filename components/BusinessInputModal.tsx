'use client'
import { useState } from 'react'
import { BUSINESS_CATEGORIES } from '@/lib/categories'
import type { Lang } from '@/lib/i18n'

interface Strings {
  MODAL_TITLE: string
  MODAL_CLOSE: string
  MODAL_SEARCH: string
  MODAL_NO_RESULTS: string
  MODAL_SHOW_ALL: string
  MODAL_SHOW_LESS: string
}

interface Props {
  onSubmit: (businessType: string) => void
  onClose: () => void
  lang: Lang
  strings: Strings
}

export default function BusinessInputModal({ onSubmit, onClose, lang, strings }: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const q = search.trim().toLowerCase()
  const isSearching = q.length > 0

  const visible = isSearching
    ? BUSINESS_CATEGORIES.filter((cat) => {
        const label = (lang === 'az' ? cat.labelAz : cat.labelEn).toLowerCase()
        return label.includes(q) || cat.key.includes(q) || cat.synonyms.some((s) => s.includes(q))
      })
    : expanded
      ? BUSINESS_CATEGORIES
      : BUSINESS_CATEGORIES.filter((cat) => cat.pinned)

  const showExpandedLayout = isSearching || expanded

  return (
    <div className="absolute inset-0 flex items-end sm:items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[420px] mx-0 sm:mx-4 pointer-events-auto flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-sm font-semibold text-slate-200 leading-tight">{strings.MODAL_TITLE}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none ml-3 shrink-0"
            aria-label={strings.MODAL_CLOSE}
          >
            ✕
          </button>
        </div>

        {showExpandedLayout ? (
          /* ── Expanded / searching layout ─────────────────────────────── */
          <>
            {/* Search input */}
            <div className="px-5 pb-3 shrink-0">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={strings.MODAL_SEARCH}
                autoFocus
                className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 bg-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category grid */}
            <div className="overflow-y-auto flex-1 px-4 pb-3">
              {visible.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">{strings.MODAL_NO_RESULTS}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {visible.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => onSubmit(cat.key)}
                      className="text-left px-3 py-3 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-colors text-sm text-slate-200 font-medium"
                    >
                      {lang === 'az' ? cat.labelAz : cat.labelEn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Collapse button — only shown when not actively searching */}
            {!isSearching && (
              <button
                onClick={() => setExpanded(false)}
                className="shrink-0 w-full text-center text-sm text-blue-400 hover:text-blue-300 py-3 border-t border-slate-700 transition-colors"
              >
                {strings.MODAL_SHOW_LESS} ↑
              </button>
            )}
          </>
        ) : (
          /* ── Collapsed layout: 3 pinned cards + expand button ─────────── */
          <div className="pb-1">
            {/* Pinned cards — single search input row for immediate typing */}
            <div className="px-5 pb-3 shrink-0">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={strings.MODAL_SEARCH}
                autoFocus
                className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 bg-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-2">
              {visible.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => onSubmit(cat.key)}
                  className="py-4 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-colors text-xs text-slate-200 font-medium text-center leading-tight"
                >
                  {lang === 'az' ? cat.labelAz : cat.labelEn}
                </button>
              ))}
            </div>
            {/* Expand button */}
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-center text-sm text-blue-400 hover:text-blue-300 py-3 border-t border-slate-700 transition-colors"
            >
              {strings.MODAL_SHOW_ALL} ↓
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
