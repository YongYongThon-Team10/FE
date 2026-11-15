import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
  eyebrow,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  eyebrow?: string
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    dialog?.focus({ preventScroll: true })
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="row between">
        <h2 id={titleId}>{title}</h2>
        {!eyebrow && (
          <button
            className="icon-button"
            type="button"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      {children}
    </dialog>
  )
}
