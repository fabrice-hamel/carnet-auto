import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, CalendarPlus, Check, ShieldCheck } from 'lucide-react'
import { addMonths, format, parseISO } from 'date-fns'
import { db } from '../../db/db'
import { validateCT } from '../../db/repo'
import type { Deadline, DeadlineType, Vehicle } from '../../db/types'
import { computeDeadline } from '../../lib/scheduling'
import { useSettings } from '../../lib/useSettings'
import { Modal, Field, StatusBadge, EmptyState, ConfirmButton, urgencyDot } from '../ui'
import { formatDate, todayISO, nowISO } from '../../lib/format'
import { generateICS } from '../../lib/ics'
import { downloadText } from '../../lib/files'

const TYPES: { value: DeadlineType; label: string; recurrence?: number }[] = [
  { value: 'controle_technique', label: 'Contrôle technique', recurrence: 24 },
  { value: 'assurance', label: 'Assurance', recurrence: 12 },
  { value: 'critair', label: "Vignette Crit'Air" },
  { value: 'garantie', label: 'Garantie' },
  { value: 'autre', label: 'Autre' },
]

export default function DeadlinesTab({ vehicle }: { vehicle: Vehicle }) {
  const settings = useSettings()
  const deadlines = useLiveQuery(
    () => db.deadlines.where('vehicleId').equals(vehicle.id!).sortBy('dueDate'),
    [vehicle.id],
  )
  const [editing, setEditing] = useState<Deadline | null>(null)
  const [adding, setAdding] = useState(false)
  const [validatingCT, setValidatingCT] = useState<Deadline | null>(null)
  if (!deadlines) return null

  const exportOne = (d: Deadline) => {
    downloadText(
      `echeance_${d.type}.ics`,
      generateICS([{ uid: `deadline-${d.id}`, title: `${d.title} — ${vehicle.name}`, date: d.dueDate, description: d.notes, alarmDaysBefore: 14 }]),
      'text/calendar',
    )
  }

  const markDone = async (d: Deadline) => {
    if (d.type === 'controle_technique') {
      setValidatingCT(d)
    } else if (d.recurrenceMonths) {
      await db.deadlines.update(d.id!, { dueDate: format(addMonths(parseISO(d.dueDate), d.recurrenceMonths), 'yyyy-MM-dd') })
    } else {
      window.alert('Échéance ponctuelle : modifiez la date manuellement.')
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Échéances</h2>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Échéance
        </button>
      </div>

      {deadlines.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={40} />} title="Aucune échéance" hint="Contrôle technique, assurance, Crit'Air, fin de garantie…" />
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
                    <button className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={() => markDone(d)} title={isCT ? 'CT validé → +2 ans' : 'Renouveler'}>
                      <Check size={14} /> {isCT ? 'Validé' : 'Fait'}
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
      {validatingCT && <CTValidateForm deadline={validatingCT} onClose={() => setValidatingCT(null)} />}
    </div>
  )
}

function CTValidateForm({ deadline, onClose }: { deadline: Deadline; onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const save = async () => {
    await validateCT(deadline.id!, date)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Contrôle technique validé"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Valider</button>
        </>
      }
    >
      <Field label="Date du contrôle technique réalisé">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
      </Field>
      <p className="text-xs text-slate-400">La prochaine échéance sera fixée à 2 ans après cette date.</p>
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
