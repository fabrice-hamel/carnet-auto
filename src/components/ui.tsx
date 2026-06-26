import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Urgency } from '../lib/scheduling'
import { URGENCY_LABEL } from '../lib/scheduling'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-brand-900 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const URGENCY_STYLE: Record<Urgency, string> = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  unknown: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
}

export function StatusBadge({ urgency, label }: { urgency: Urgency; label?: string }) {
  return <span className={`chip ${URGENCY_STYLE[urgency]}`}>{label ?? URGENCY_LABEL[urgency]}</span>
}

export function urgencyDot(urgency: Urgency): string {
  return {
    overdue: 'bg-red-500',
    soon: 'bg-amber-500',
    ok: 'bg-emerald-500',
    unknown: 'bg-slate-300 dark:bg-slate-600',
  }[urgency]
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10">
      <div className="mb-3 text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
      {action}
    </div>
  )
}

export function ConfirmButton({
  label,
  onConfirm,
  className = 'btn-danger',
  confirmText = 'Confirmer ?',
}: {
  label: ReactNode
  onConfirm: () => void
  className?: string
  confirmText?: string
}) {
  return (
    <button
      className={className}
      onClick={() => {
        if (window.confirm(confirmText)) onConfirm()
      }}
    >
      {label}
    </button>
  )
}
