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
      {/* Panel */}
      <div
        className="w-full sm:w-[420px] mx-0 sm:mx-4 pointer-events-auto flex flex-col max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{
          background: '#0D1218',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,201,138,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00C98A' }}
            />
            <h2
              className="text-sm font-semibold leading-tight"
              style={{ color: 'rgba(226,232,240,0.9)', letterSpacing: '0.01em' }}
            >
              {strings.MODAL_TITLE}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
            style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(226,232,240,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.6)')}
            aria-label={strings.MODAL_CLOSE}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {showExpandedLayout ? (
          <>
            {/* Search input */}
            <div className="px-4 py-3 shrink-0">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="14" height="14" viewBox="0 0 16 16" fill="none"
                  stroke="rgba(100,116,139,0.7)" strokeWidth="1.6" strokeLinecap="round"
                >
                  <circle cx="7" cy="7" r="5" />
                  <path d="M11 11l3 3" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={strings.MODAL_SEARCH}
                  autoFocus
                  className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(226,232,240,0.9)',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(0,201,138,0.35)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
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
                      className="text-left px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: 'rgba(226,232,240,0.8)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(0,201,138,0.4)'
                        e.currentTarget.style.background = 'rgba(0,201,138,0.06)'
                        e.currentTarget.style.color = 'rgba(226,232,240,1)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.color = 'rgba(226,232,240,0.8)'
                      }}
                    >
                      {lang === 'az' ? cat.labelAz : cat.labelEn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isSearching && (
              <button
                onClick={() => setExpanded(false)}
                className="shrink-0 w-full text-center text-xs py-3 transition-colors duration-150"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(0,201,138,0.7)',
                  letterSpacing: '0.06em',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#00C98A')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,201,138,0.7)')}
              >
                {strings.MODAL_SHOW_LESS}
              </button>
            )}
          </>
        ) : (
          <div className="pb-1">
            {/* Search input */}
            <div className="px-4 py-3 shrink-0">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="14" height="14" viewBox="0 0 16 16" fill="none"
                  stroke="rgba(100,116,139,0.7)" strokeWidth="1.6" strokeLinecap="round"
                >
                  <circle cx="7" cy="7" r="5" />
                  <path d="M11 11l3 3" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={strings.MODAL_SEARCH}
                  autoFocus
                  className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(226,232,240,0.9)',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(0,201,138,0.35)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            </div>

            {/* Pinned cards */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-2">
              {visible.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => onSubmit(cat.key)}
                  className="py-4 rounded-xl text-xs font-semibold text-center leading-tight transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(226,232,240,0.75)',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,201,138,0.45)'
                    e.currentTarget.style.background = 'rgba(0,201,138,0.07)'
                    e.currentTarget.style.color = '#00C98A'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.color = 'rgba(226,232,240,0.75)'
                  }}
                >
                  {lang === 'az' ? cat.labelAz : cat.labelEn}
                </button>
              ))}
            </div>

            {/* Expand button */}
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-center text-xs py-3 transition-colors duration-150 flex items-center justify-center gap-1.5"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(0,201,138,0.7)',
                letterSpacing: '0.06em',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00C98A')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,201,138,0.7)')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v8M2 6h8" />
              </svg>
              {strings.MODAL_SHOW_ALL}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
