import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Check, History, Trash2 } from 'lucide-react'
import { db } from '../../db/db'
import { completeTask } from '../../db/repo'
import type { MaintenanceTask, Vehicle } from '../../db/types'
import { computeTask } from '../../lib/scheduling'
import { useSettings } from '../../lib/useSettings'
import { Modal, Field, StatusBadge, EmptyState, ConfirmButton, urgencyDot } from '../ui'
import { formatKm, formatDate, todayISO, nowISO, formatMoney } from '../../lib/format'
import { MAINTENANCE_CATEGORIES } from '../../lib/presets'

export default function MaintenanceTab({ vehicle }: { vehicle: Vehicle }) {
  const settings = useSettings()
  const tasks = useLiveQuery(() => db.tasks.where('vehicleId').equals(vehicle.id!).toArray(), [vehicle.id])
  const services = useLiveQuery(
    () => db.services.where('vehicleId').equals(vehicle.id!).reverse().sortBy('date'),
    [vehicle.id],
  )
  const [editTask, setEditTask] = useState<MaintenanceTask | null>(null)
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState<MaintenanceTask | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [addingHistory, setAddingHistory] = useState(false)

  if (!tasks) return null

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Plan d'entretien</h2>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Tâche
        </button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={<Plus size={40} />} title="Aucune tâche d'entretien" hint="Ajoutez une tâche (vidange, freins…) avec sa périodicité en km et/ou en mois." />
      ) : (
        <div className="space-y-2">
          {tasks
            .slice()
            .sort((a, b) => Number(b.active) - Number(a.active))
            .map((t) => {
              const c = computeTask(t, vehicle, settings)
              return (
                <div key={t.id} className={`card p-3.5 ${!t.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${urgencyDot(c.urgency)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{t.title}</p>
                        <StatusBadge urgency={c.urgency} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {intervalText(t)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{dueText(c)}</p>
                      {(t.lastDoneDate || t.lastDoneKm !== undefined) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Dernier : {t.lastDoneDate ? formatDate(t.lastDoneDate) : '—'}
                          {t.lastDoneKm !== undefined ? ` · ${formatKm(t.lastDoneKm)}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={() => setCompleting(t)} title="Marquer comme fait">
                        <Check size={14} /> Fait
                      </button>
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setEditTask(t)} aria-label="Modifier">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Historique des interventions */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setShowHistory((s) => !s)} className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <History size={16} /> Historique {services?.length ? `(${services.length})` : ''}
        </button>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => { setShowHistory(true); setAddingHistory(true) }}>
          <Plus size={16} /> Intervention
        </button>
      </div>
      {showHistory && (
        <div className="mt-3 space-y-2">
          {!services?.length ? (
            <p className="text-sm text-slate-400">Aucune intervention enregistrée.</p>
          ) : (
            services.map((s) => (
              <div key={s.id} className="card flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(s.date)} · {formatKm(s.mileage)}
                    {s.vendor ? ` · ${s.vendor}` : ''}
                    {s.cost ? ` · ${formatMoney(s.cost)}` : ''}
                  </p>
                </div>
                <ConfirmButton
                  label={<Trash2 size={14} />}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  confirmText="Supprimer cette intervention ?"
                  onConfirm={() => db.services.delete(s.id!)}
                />
              </div>
            ))
          )}
        </div>
      )}

      {(adding || editTask) && (
        <TaskForm
          vehicleId={vehicle.id!}
          initial={editTask ?? undefined}
          onClose={() => {
            setAdding(false)
            setEditTask(null)
          }}
        />
      )}
      {completing && <CompleteForm vehicle={vehicle} task={completing} onClose={() => setCompleting(null)} />}
      {addingHistory && <HistoryForm vehicle={vehicle} onClose={() => setAddingHistory(false)} />}
    </div>
  )
}

function HistoryForm({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [mileage, setMileage] = useState(String(vehicle.currentMileage))
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')

  const save = async () => {
    if (!title.trim()) return window.alert("Indiquez l'intervention réalisée.")
    await completeTask({
      vehicleId: vehicle.id!,
      date,
      mileage: Number(mileage) || 0,
      title: title.trim(),
      cost: cost ? Number(cost) : undefined,
      vendor: vendor.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Ajouter à l'historique"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <Field label="Intervention réalisée">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Remplacement plaquettes avant" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Kilométrage">
          <input type="number" inputMode="numeric" className="input" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Coût (€)">
          <input type="number" inputMode="decimal" className="input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="optionnel" />
        </Field>
        <Field label="Garage / prestataire">
          <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="optionnel" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optionnel" />
      </Field>
      <p className="text-xs text-slate-400">Pour consigner les interventions déjà faites (avant l'achat ou hors plan d'entretien).</p>
    </Modal>
  )
}

function intervalText(t: MaintenanceTask): string {
  const parts: string[] = []
  if (t.intervalKm) parts.push(`tous les ${formatKm(t.intervalKm)}`)
  if (t.intervalMonths) parts.push(`tous les ${t.intervalMonths} mois`)
  return parts.length ? `${t.category} · ${parts.join(' ou ')}` : t.category
}

function dueText(c: ReturnType<typeof computeTask>): string {
  if (c.urgency === 'unknown') return 'À renseigner (marquez « Fait » pour démarrer le suivi)'
  const parts: string[] = []
  if (c.dueDate) {
    parts.push(
      c.daysRemaining !== undefined && c.daysRemaining < 0
        ? `En retard depuis le ${formatDate(c.dueDate)}`
        : `Prochaine échéance : ${formatDate(c.dueDate)}`,
    )
  }
  if (c.dueKm !== undefined) {
    parts.push(
      c.kmRemaining !== undefined && c.kmRemaining < 0
        ? `${formatKm(-c.kmRemaining)} au-delà de ${formatKm(c.dueKm)}`
        : `à ${formatKm(c.dueKm)}`,
    )
  }
  return parts.join(' · ')
}

function TaskForm({ vehicleId, initial, onClose }: { vehicleId: number; initial?: MaintenanceTask; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Moteur')
  const [intervalKm, setIntervalKm] = useState(initial?.intervalKm ? String(initial.intervalKm) : '')
  const [intervalMonths, setIntervalMonths] = useState(initial?.intervalMonths ? String(initial.intervalMonths) : '')
  const [active, setActive] = useState(initial?.active ?? true)

  const save = async () => {
    if (!title.trim()) return window.alert('Le titre est obligatoire.')
    if (!intervalKm && !intervalMonths) return window.alert('Indiquez au moins une périodicité (km ou mois).')
    const data = {
      vehicleId,
      title: title.trim(),
      category,
      intervalKm: intervalKm ? Number(intervalKm) : undefined,
      intervalMonths: intervalMonths ? Number(intervalMonths) : undefined,
      active,
    }
    if (initial?.id) await db.tasks.update(initial.id, data)
    else await db.tasks.add({ ...data, createdAt: nowISO() })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Modifier la tâche' : 'Nouvelle tâche'}
      footer={
        <>
          {initial?.id && (
            <ConfirmButton label="Supprimer" confirmText="Supprimer cette tâche ?" onConfirm={async () => { await db.tasks.delete(initial.id!); onClose() }} />
          )}
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <Field label="Intitulé">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Vidange moteur" autoFocus />
      </Field>
      <Field label="Catégorie">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {MAINTENANCE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tous les (km)" hint="optionnel">
          <input type="number" inputMode="numeric" className="input" value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} placeholder="30000" />
        </Field>
        <Field label="Tous les (mois)" hint="optionnel">
          <input type="number" inputMode="numeric" className="input" value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} placeholder="12" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" /> Tâche active
      </label>
    </Modal>
  )
}

function CompleteForm({ vehicle, task, onClose }: { vehicle: Vehicle; task: MaintenanceTask; onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [mileage, setMileage] = useState(String(vehicle.currentMileage))
  const [cost, setCost] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')

  const save = async () => {
    await completeTask({
      vehicleId: vehicle.id!,
      taskId: task.id,
      date,
      mileage: Number(mileage) || 0,
      title: task.title,
      cost: cost ? Number(cost) : undefined,
      vendor: vendor.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`« ${task.title} » réalisé`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Valider</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Kilométrage">
          <input type="number" inputMode="numeric" className="input" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Coût (€)">
          <input type="number" inputMode="decimal" className="input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="optionnel" />
        </Field>
        <Field label="Garage / prestataire">
          <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="optionnel" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optionnel" />
      </Field>
      <p className="text-xs text-slate-400">L'échéance suivante et le kilométrage du véhicule seront mis à jour automatiquement.</p>
    </Modal>
  )
}
