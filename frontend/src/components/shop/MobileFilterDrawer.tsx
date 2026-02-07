'use client'

import { useEffect, useRef } from 'react'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  activeCount?: number
}

export default function MobileFilterDrawer({ isOpen, onClose, children, activeCount }: MobileFilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 w-[85vw] max-w-[380px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out lg:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Filtre</h2>
            {activeCount && activeCount > 0 ? (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                {activeCount}
              </span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {children}
        </div>

        {/* Bottom action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--primary)' }}
          >
            Zobraziť výsledky
          </button>
        </div>
      </div>
    </>
  )
}
