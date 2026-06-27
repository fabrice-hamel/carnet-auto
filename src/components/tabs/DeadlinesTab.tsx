import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, CalendarPlus, Check, ShieldCheck, FileText, Paperclip, X } from 'lucide-react'
import { addMonths, format, parseISO } from 'date-fns'
import { db } from '../../db/db'
import { validateCT } from '../../db/repo'
import type { Deadline, DeadlineType, Vehicle } from '../../db/types'
import { computeDeadline } from '../../lib/scheduling'
import { useSettings } from '../../lib/useSettings'
import { Modal, Field, StatusBadge, ConfirmButton, urgencyDot } from '../ui'
import { formatDate, todayISO, nowISO } from '../../lib/format'
import { generateICS } from '../../lib/ics'
import { downloadText, fileToStorableDataURL, isPdfDataUrl, pickFile } from '../../lib/files'

const TYPES: { value: DeadlineType; label: string; recurrence?: number }[] = [
  { value: 'controle_technique', label: 'Contrôle technique', recurrence: 24 },
  { value: 'assurance', label: 'Assurance', recurrence: 12 },
  { value: 'critair', label: "Vignette Crit'Air" },
  { value: 'garantie', label: 'Garantie' },
  { value: 'autre', label: 'Autre' },
]

export function DeadlinesSection({ vehicle }: { vehicle: Vehicle }) {
  const settings = useSettings()
  const deadlines = useLiveQuery(
    () => db.deadlines.where('vehicleId').equals(vehicle.id!).sortBy('dueDate'),
    [vehicle.id],
  )
  const [editing, setEditing] = useState<Deadline | null>(null)
  const [adding, setAdding] = useState(false)
  const [validating, setValidating] = useState<Deadline | null>(null)
  if (!deadlines) return null

  const exportOne = (d: Deadline) => {
    downloadText(
      `echeance_${d.type}.ics`,
      generateICS([{ uid: `deadline-${d.id}`, title: `${d.title} — ${vehicle.name}`, date: d.dueDate, description: d.notes, alarmDaysBefore: 14 }]),
      'text/calendar',
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <ShieldCheck size={16} /> Administratif {deadlines.length ? `(${deadlines.length})` : ''}
        </h2>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Échéance
        </button>
      </div>

      {deadlines.length === 0 ? (
        <p className="mb-2 text-sm text-slate-400">
          Contrôle technique, assurance, vignette Crit'Air, fin de garantie… Ajoutez vos dates administratives.
        </p>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => {
            const c = computeDeadline(d, settings)
            const isCT = d.type === 'controle_technique'
            return (
              <div key={d.id} className="card p-3.5">
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${urgencyDot(c.urgency)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{d.title}</p>
                      <StatusBadge urgency={c.urgency} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {c.daysRemaining < 0 ? `En retard depuis le ${formatDate(d.dueDate)}` : `Échéance : ${formatDate(d.dueDate)} (dans ${c.daysRemaining} j)`}
                    </p>
                    {isCT && <p className="mt-0.5 text-xs text-slate-400">Règle FR : 4 ans puis tous les 2 ans.</p>}
                    {d.notes && !isCT && <p className="mt-0.5 text-xs text-slate-400">{d.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={() => setValidating(d)} title="Enregistrer comme réalisé (coût, document) et reporter">
                      <Check size={14} /> Marquer réalisé
                    </button>
                    <div className="flex gap-1">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => exportOne(d)} aria-label="Calendrier">
                        <CalendarPlus size={14} />
                      </button>
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setEditing(d)} aria-label="Modifier">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(adding || editing) && <DeadlineForm vehicleId={vehicle.id!} initial={editing ?? undefined} onClose={() => { setAdding(false); setEditing(null) }} />}
      {validating && <ValidateDeadlineForm vehicle={vehicle} deadline={validating} onClose={() => setValidating(null)} />}
    </div>
  )
}

/** Valide une échéance administrative : enregistre le coût + document dans l'historique/dépenses, puis reporte la date. */
function ValidateDeadlineForm({ vehicle, deadline, onClose }: { vehicle: Vehicle; deadline: Deadline; onClose: () => void }) {
  const isCT = deadline.type === 'controle_technique'
  const [date, setDate] = useState(todayISO())
  const [cost, setCost] = useState('')
  const [vendor, setVendor] = useState('')
  const [attachments, setAttachments] = useState<{ dataUrl: string; title: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const addAttachment = async () => {
    const file = await pickFile('image/*,application/pdf')
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await fileToStorableDataURL(file)
      setAttachments((a) => [...a, { dataUrl, title: file.name.replace(/\.[^.]+$/, '') }])
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      // pièces jointes (rapport CT, attestation…)
      const ids: number[] = []
      for (const a of attachments) {
        const id = await db.documents.add({
          vehicleId: vehicle.id!,
          type: isCT ? 'controle_technique' : 'autre',
          title: a.title || deadline.title,
          date,
          dataUrl: a.dataUrl,
          createdAt: nowISO(),
        })
        ids.push(id)
      }
      // trace dans l'historique (et donc dans les dépenses si coût)
      await db.services.add({
        vehicleId: vehicle.id!,
        status: 'done',
        date,
        mileage: vehicle.currentMileage,
        title: deadline.title,
        cost: cost ? Number(cost) : undefined,
        vendor: vendor.trim() || undefined,
        documentIds: ids.length ? ids : undefined,
        createdAt: nowISO(),
      })
      // report de l'échéance
      if (isCT) {
        await validateCT(deadline.id!, date)
      } else if (deadline.recurrenceMonths) {
        await db.deadlines.update(deadline.id!, {
          dueDate: format(addMonths(parseISO(date), deadline.recurrenceMonths), 'yyyy-MM-dd'),
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${deadline.title} — réalisé`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Valider'}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date réalisée">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
        </Field>
        <Field label="Coût (€)">
          <input type="number" inputMode="decimal" className="input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="optionnel" />
        </Field>
      </div>
      <Field label="Centre / prestataire">
        <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="optionnel" />
      </Field>
      <Field label={isCT ? 'Rapport de CT / document' : 'Document'} hint="Photo ou PDF (optionnel)">
        <div className="space-y-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-100 p-2 dark:bg-white/5">
              {isPdfDataUrl(a.dataUrl) ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15"><FileText size={18} /></span>
              ) : (
                <img src={a.dataUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{a.title}</span>
              <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))} aria-label="Retirer">
                <X size={16} />
              </button>
            </div>
          ))}
          <button className="btn-ghost w-full" onClick={addAttachment} disabled={busy}>
            <Paperclip size={16} /> {busy ? 'Chargement…' : 'Ajouter un document'}
          </button>
        </div>
      </Field>
      <p className="text-xs text-slate-400">
        Enregistré dans l'historique et les dépenses.{' '}
        {isCT ? 'Prochain CT fixé à +2 ans.' : deadline.recurrenceMonths ? `Prochaine échéance dans ${deadline.recurrenceMonths} mois.` : ''}
      </p>
    </Modal>
  )
}

function DeadlineForm({ vehicleId, initial, onClose }: { vehicleId: number; initial?: Deadline; onClose: () => void }) {
  const [type, setType] = useState<DeadlineType>(initial?.type ?? 'assurance')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayISO())
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const onType = (t: DeadlineType) => {
    setType(t)
    if (!title) setTitle(TYPES.find((x) => x.value === t)?.label ?? '')
  }

  const save = async () => {
    const rec = TYPES.find((x) => x.value === type)?.recurrence
    const data = {
      vehicleId,
      type,
      title: title.trim() || TYPES.find((x) => x.value === type)?.label || 'Échéance',
      dueDate,
      recurrenceMonths: rec,
      notes: notes.trim() || undefined,
    }
    if (initial?.id) await db.deadlines.update(initial.id, data)
    else await db.deadlines.add({ ...data, createdAt: nowISO() })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Modifier l'échéance" : 'Nouvelle échéance'}
      footer={
        <>
          {initial?.id && (
            <ConfirmButton label="Supprimer" confirmText="Supprimer cette échéance ?" onConfirm={async () => { await db.deadlines.delete(initial.id!); onClose() }} />
          )}
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <Field label="Type">
        <select className="input" value={type} onChange={(e) => onType(e.target.value as DeadlineType)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Intitulé">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Assurance Macif" />
      </Field>
      <Field label="Date d'échéance">
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label="Note">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optionnel" />
      </Field>
    </Modal>
  )
}
