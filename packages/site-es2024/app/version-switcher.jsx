'use client'

import { useEffect, useRef, useState } from 'react'

const editions = JSON.parse(process.env.NEXT_PUBLIC_EDITIONS || '[]')
const deployBase = process.env.NEXT_PUBLIC_DEPLOY_BASE || '/'
const currentHref = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`

// Trigger placed next to the title; clicking it drops down links to every
// other edition. Closes on outside-click or Escape.
export function VersionSwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className="ecma-vs" ref={ref}>
      <button
        type="button"
        className="ecma-vs-trigger"
        aria-label="Switch ECMAScript version"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ▾
      </button>
      {open && (
        <ul className="ecma-vs-menu" role="menu">
          {editions.map((e) => {
            const href = `${deployBase}${e.id}/`
            const current = href === currentHref
            return (
              <li key={e.id} role="none">
                <a
                  role="menuitem"
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={current ? 'ecma-vs-item ecma-vs-current' : 'ecma-vs-item'}
                >
                  {e.title}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </span>
  )
}
