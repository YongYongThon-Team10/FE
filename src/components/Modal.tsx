import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
  eyebrow,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  eyebrow?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
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
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <div className="row between">
        <h2>{title}</h2>
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
