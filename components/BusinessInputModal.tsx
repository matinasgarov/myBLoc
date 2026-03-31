'use client'
import { useState } from 'react'
import { AZ } from '@/lib/az'

interface Props {
  onSubmit: (businessType: string) => void
  onClose: () => void
}

export default function BusinessInputModal({ onSubmit, onClose }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4 pointer-events-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-4">{AZ.MODAL_TITLE}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={AZ.MODAL_PLACEHOLDER}
            className="border border-gray-300 rounded-lg px-4 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            >
              {AZ.MODAL_CLOSE}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {AZ.MODAL_SUBMIT}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
