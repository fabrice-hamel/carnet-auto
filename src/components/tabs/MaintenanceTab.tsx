import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Check, History, Trash2, ChevronDown, Wrench, Paperclip, FileText, X } from 'lucide-react'
import { db } from '../../db/db'
import { completeTask } from '../../db/repo'
import type { DocumentBlob, MaintenanceTask, ServiceRecord, Settings, Vehicle } from '../../db/types'
import { computeTask, type TaskComputed, type Urgency } from '../../lib/scheduling'
import { useSettings } from '../../lib/useSettings'
import { Modal, Field, StatusBadge, EmptyState, ConfirmButton, urgencyDot } from '../ui'
import { formatKm, formatDate, todayISO, nowISO, formatMoney } from '../../lib/format'
import { fileToStorableDataURL, isPdfDataUrl, openDataUrl, pickFile } from '../../lib/files'
import { MAINTENANCE_CATEGORIES } from '../../lib/presets'

export default function MaintenanceTab({ vehicle }: { vehicle: Vehicle }) {
  const settings = useSettings()
  const tasks = useLiveQuery(() => db.tasks.where('vehicleId').equals(vehicle.id!).toArray(), [vehicle.id])
  const services = useLiveQuery(
    () => db.services.where('vehicleId').equals(vehicle.id!).reverse().sortBy('date'),
    [vehicle.id],
  )
  const documents = useLiveQuery(() => db.documents.where('vehicleId').equals(vehicle.id!).toArray(), [vehicle.id])
  const docMap = new Map((documents ?? []).map((d) => [d.id!, d]))
  const [viewDoc, setViewDoc] = useState<DocumentBlob | null>(null)
  const [editTask, setEditTask] = useState<MaintenanceTask | null>(null)
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState<MaintenanceTask | null>(null)
  const [showPlan, setShowPlan] = useState(true)
  const [addingHistory, setAddingHistory] = useState(false)
  const [editingHistory, setEditingHistory] = useState<ServiceRecord | null>(null)

  if (!tasks) return null

  const suggestions = topSuggestions(tasks, vehicle, settings, 3)

  return (
    <div>
      {/* PROCHAINES MAINTENANCES — proposées d'après l'historique + le plan */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Wrench size={14} /> Prochaines maintenances
          </p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.task.id} className={`rounded-2xl border-l-4 p-3 shadow-sm ring-1 ${suggestionTint(s.urgency)}`}>
                <p className="font-semibold">{s.task.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{dueText(s.computed)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORIQUE — interventions réellement effectuées (en premier) */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <History size={16} /> Historique {services?.length ? `(${services.length})` : ''}
        </h2>
        <button className="btn-primary !px-3 !py-1.5" onClick={() => setAddingHistory(true)}>
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {!services?.length ? (
        <EmptyState
          icon={<History size={40} />}
          title="Aucun entretien enregistré"
          hint="Ajoutez les entretiens déjà réalisés (avant l'achat ou récents) pour bâtir l'historique du véhicule."
        />
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className="card flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDate(s.date)} · {formatKm(s.mileage)}
                  {s.vendor ? ` · ${s.vendor}` : ''}
                  {s.cost ? ` · ${formatMoney(s.cost)}` : ''}
                </p>
                {s.notes && <p className="mt-0.5 text-xs text-slate-400">{s.notes}</p>}
                {!!s.documentIds?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.documentIds.map((id) => {
                      const d = docMap.get(id)
                      if (!d) return null
                      const pdf = isPdfDataUrl(d.dataUrl)
                      return (
                        <button
                          key={id}
                          onClick={() => (pdf ? openDataUrl(d.dataUrl) : setViewDoc(d))}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                          title={d.title}
                        >
                          {pdf ? <FileText size={13} /> : <Paperclip size={13} />}
                          <span className="max-w-[8rem] truncate">{d.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                  onClick={() => setEditingHistory(s)}
                  aria-label="Modifier"
                >
                  <Pencil size={15} />
                </button>
                <ConfirmButton
                  label={<Trash2 size={15} />}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  confirmText="Supprimer cette intervention de l'historique ?"
                  onConfirm={async () => {
                    if (s.documentIds?.length) await db.documents.bulkDelete(s.documentIds)
                    await db.services.delete(s.id!)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLAN D'ENTRETIEN PRÉVISIONNEL — échéances théoriques (déroulé) */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setShowPlan((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          <ChevronDown size={18} className={`transition ${showPlan ? '' : '-rotate-90'}`} />
          Plan prévisionnel {tasks.length ? `(${tasks.length})` : ''}
        </button>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Tâche
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Échéances théoriques (km et/ou temps) pour anticiper vos prochains entretiens. Bouton « Fait » = ajoute à l'historique et décale l'échéance.
      </p>

      {showPlan &&
        (tasks.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={<Plus size={40} />} title="Aucune tâche planifiée" hint="Ajoutez une tâche (vidange, freins…) avec sa périodicité en km et/ou en mois." />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
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
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{intervalText(t)}</p>
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
        ))}

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
      {(addingHistory || editingHistory) && (
        <HistoryForm
          vehicle={vehicle}
          tasks={tasks}
          initial={editingHistory ?? undefined}
          onClose={() => {
            setAddingHistory(false)
            setEditingHistory(null)
          }}
        />
      )}
      {viewDoc && (
        <Modal open onClose={() => setViewDoc(null)} title={viewDoc.title}>
          <img src={viewDoc.dataUrl} alt={viewDoc.title} className="mx-auto max-h-[70vh] rounded-xl" />
        </Modal>
      )}
    </div>
  )
}

/** Propose les prochaines maintenances : tâches du plan triées par échéance (km/temps) la plus proche. */
function topSuggestions(
  tasks: MaintenanceTask[],
  vehicle: Vehicle,
  settings: Settings,
  n: number,
): { task: MaintenanceTask; computed: TaskComputed; urgency: Urgency }[] {
  const items: { task: MaintenanceTask; computed: TaskComputed; urgency: Urgency; key: number }[] = []
  for (const t of tasks) {
    if (!t.active) continue
    const c = computeTask(t, vehicle, settings)
    if (c.urgency === 'unknown') continue
    // "jours avant échéance" effectif : min entre l'échéance temps et l'échéance km estimée
    const kmDays =
      c.kmRemaining !== undefined && vehicle.avgKmPerYear > 0
        ? (c.kmRemaining / vehicle.avgKmPerYear) * 365
        : undefined
    const key = Math.min(c.daysRemaining ?? Infinity, kmDays ?? Infinity)
    items.push({ task: t, computed: c, urgency: c.urgency, key })
  }
  items.sort((a, b) => a.key - b.key)
  return items.slice(0, n).map(({ task, computed, urgency }) => ({ task, computed, urgency }))
}

function suggestionTint(urgency: Urgency): string {
  switch (urgency) {
    case 'overdue':
      return 'border-red-500 bg-red-50 ring-red-100 dark:bg-red-500/10 dark:ring-red-500/20'
    case 'soon':
      return 'border-amber-500 bg-amber-50 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20'
    default:
      return 'border-emerald-500 bg-emerald-50 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20'
  }
}

function HistoryForm({
  vehicle,
  tasks,
  initial,
  onClose,
}: {
  vehicle: Vehicle
  tasks: MaintenanceTask[]
  initial?: ServiceRecord
  onClose: () => void
}) {
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [mileage, setMileage] = useState(String(initial?.mileage ?? vehicle.currentMileage))
  const [title, setTitle] = useState(initial?.title ?? '')
  const [taskId, setTaskId] = useState(initial?.taskId ? String(initial.taskId) : '')
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '')
  const [vendor, setVendor] = useState(initial?.vendor ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attachments, setAttachments] = useState<{ id?: number; dataUrl: string; title: string }[]>([])
  const isEdit = !!initial?.id

  // Charge les pièces jointes existantes (en modification)
  useEffect(() => {
    if (initial?.documentIds?.length) {
      db.documents.bulkGet(initial.documentIds).then((docs) => {
        setAttachments(docs.filter(Boolean).map((d) => ({ id: d!.id, dataUrl: d!.dataUrl, title: d!.title })))
      })
    }
  }, [initial])

  const addAttachment = async () => {
    const file = await pickFile('image/*,application/pdf')
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await fileToStorableDataURL(file)
      setAttachments((a) => [...a, { dataUrl, title: file.name.replace(/\.[^.]+$/, '') }])
    } catch (e) {
      setError('Fichier illisible : ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Si on choisit une tâche et que le titre est vide, on reprend le nom de la tâche.
  const onPickTask = (val: string) => {
    setTaskId(val)
    if (val && !title.trim()) {
      const t = tasks.find((x) => String(x.id) === val)
      if (t) setTitle(t.title)
    }
  }

  const save = async () => {
    if (!title.trim()) {
      setError("Indiquez l'intervention réalisée (ex. Vidange).")
      return
    }
    setSaving(true)
    const tid = taskId ? Number(taskId) : undefined
    try {
      // Persiste les pièces jointes : ajoute les nouvelles, supprime celles retirées.
      const ids: number[] = []
      for (const a of attachments) {
        if (a.id) ids.push(a.id)
        else {
          const newId = await db.documents.add({
            vehicleId: vehicle.id!,
            type: 'facture',
            title: a.title || 'Facture',
            date,
            dataUrl: a.dataUrl,
            createdAt: nowISO(),
          })
          ids.push(newId)
        }
      }
      if (isEdit && initial?.documentIds?.length) {
        const removed = initial.documentIds.filter((id) => !ids.includes(id))
        if (removed.length) await db.documents.bulkDelete(removed)
      }
      const documentIds = ids.length ? ids : undefined

      if (isEdit) {
        await db.services.update(initial!.id!, {
          date,
          mileage: Number(mileage) || 0,
          title: title.trim(),
          taskId: tid,
          cost: cost ? Number(cost) : undefined,
          vendor: vendor.trim() || undefined,
          notes: notes.trim() || undefined,
          documentIds,
        })
        // si reliée à une tâche, on met à jour son dernier entretien
        if (tid) await db.tasks.update(tid, { lastDoneDate: date, lastDoneKm: Number(mileage) || 0 })
      } else {
        await completeTask({
          vehicleId: vehicle.id!,
          taskId: tid,
          date,
          mileage: Number(mileage) || 0,
          title: title.trim(),
          cost: cost ? Number(cost) : undefined,
          vendor: vendor.trim() || undefined,
          notes: notes.trim() || undefined,
          documentIds,
        })
      }
      onClose()
    } catch (e) {
      setError('Erreur lors de l’enregistrement : ' + (e as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Modifier l'intervention" : "Ajouter à l'historique"}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      }
    >
      <Field label="Intervention réalisée">
        <input className="input" value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="Ex. Remplacement plaquettes avant" autoFocus />
      </Field>
      {error && <p className="-mt-1 mb-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {tasks.length > 0 && (
        <Field label="Concerne la tâche du plan" hint="Relie cette intervention à une tâche pour recalculer la prochaine échéance.">
          <select className="input" value={taskId} onChange={(e) => onPickTask(e.target.value)}>
            <option value="">— Aucune (intervention libre) —</option>
            {tasks.map((t) => (
              <option key={t.id} value={String(t.id)}>{t.title}</option>
            ))}
          </select>
        </Field>
      )}
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

      <Field label="Factures / documents" hint="Photo ou PDF — facture de l'entretien, bon de garage…">
        <div className="space-y-2">
          {attachments.map((a, i) => {
            const pdf = isPdfDataUrl(a.dataUrl)
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-100 p-2 dark:bg-white/5">
                {pdf ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15">
                    <FileText size={18} />
                  </span>
                ) : (
                  <img src={a.dataUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{a.title}{pdf ? ' (PDF)' : ''}</span>
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))}
                  aria-label="Retirer"
                >
                  <X size={16} />
                </button>
              </div>
            )
          })}
          <button className="btn-ghost w-full" onClick={addAttachment} disabled={busy}>
            <Paperclip size={16} /> {busy ? 'Chargement…' : 'Ajouter une facture / un document'}
          </button>
        </div>
      </Field>

      <p className="text-xs text-slate-400">
        Reliez l'intervention à une tâche du plan pour que l'app propose automatiquement la prochaine échéance.
      </p>
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
