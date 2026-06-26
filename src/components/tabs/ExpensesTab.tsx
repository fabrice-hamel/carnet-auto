import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, Receipt } from 'lucide-react'
import { db } from '../../db/db'
import type { Vehicle } from '../../db/types'
import { Modal, Field, EmptyState, ConfirmButton } from '../ui'
import { formatDate, formatMoney, todayISO, nowISO } from '../../lib/format'
import { EXPENSE_CATEGORIES } from '../../lib/presets'
import { BarChartCard } from '../charts'
import { format, parseISO, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ExpensesTab({ vehicle }: { vehicle: Vehicle }) {
  const expenses = useLiveQuery(
    () => db.expenses.where('vehicleId').equals(vehicle.id!).reverse().sortBy('date'),
    [vehicle.id],
  )
  const services = useLiveQuery(() => db.services.where('vehicleId').equals(vehicle.id!).toArray(), [vehicle.id])
  const fuel = useLiveQuery(() => db.fuel.where('vehicleId').equals(vehicle.id!).toArray(), [vehicle.id])
  const [adding, setAdding] = useState(false)
  if (!expenses) return null

  const year = new Date().getFullYear()
  const inYear = (iso: string) => iso.startsWith(String(year))
  // Coût global = dépenses + interventions chiffrées + carburant
  const total =
    expenses.reduce((s, e) => s + e.amount, 0) +
    (services?.reduce((s, x) => s + (x.cost ?? 0), 0) ?? 0) +
    (fuel?.reduce((s, x) => s + (x.totalCost ?? 0), 0) ?? 0)
  const totalYear =
    expenses.filter((e) => inYear(e.date)).reduce((s, e) => s + e.amount, 0) +
    (services?.filter((x) => inYear(x.date)).reduce((s, x) => s + (x.cost ?? 0), 0) ?? 0) +
    (fuel?.filter((x) => inYear(x.date)).reduce((s, x) => s + (x.totalCost ?? 0), 0) ?? 0)

  // Coûts par mois sur les 12 derniers mois (dépenses + interventions + carburant)
  const monthly = buildMonthly(
    [
      ...expenses.map((e) => ({ date: e.date, amount: e.amount })),
      ...(services ?? []).map((x) => ({ date: x.date, amount: x.cost ?? 0 })),
      ...(fuel ?? []).map((x) => ({ date: x.date, amount: x.totalCost ?? 0 })),
    ],
  )
  const hasChartData = monthly.some((m) => m.value > 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dépenses</h2>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Dépense
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-3 text-center">
          <div className="text-lg font-bold">{formatMoney(totalYear)}</div>
          <div className="text-[11px] text-slate-400">coût total {year}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg font-bold">{formatMoney(total)}</div>
          <div className="text-[11px] text-slate-400">coût total (tout)</div>
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-400">Inclut dépenses, interventions chiffrées et carburant.</p>

      {hasChartData && (
        <div className="card mb-4 p-3">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Coûts par mois (12 mois)</p>
          <BarChartCard data={monthly} unit="€" />
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState icon={<Receipt size={40} />} title="Aucune dépense" hint="Ajoutez assurance, pneus, péages, réparations…" />
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {e.category} · {formatMoney(e.amount)}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(e.date)}
                  {e.notes ? ` · ${e.notes}` : ''}
                </p>
              </div>
              <ConfirmButton
                label={<Trash2 size={14} />}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                confirmText="Supprimer cette dépense ?"
                onConfirm={() => db.expenses.delete(e.id!)}
              />
            </div>
          ))}
        </div>
      )}

      {adding && <ExpenseForm vehicle={vehicle} onClose={() => setAdding(false)} />}
    </div>
  )
}

/** Totaux par mois sur les 12 derniers mois. */
function buildMonthly(items: { date: string; amount: number }[]): { label: string; value: number }[] {
  const now = new Date()
  const buckets: { key: string; label: string; value: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    buckets.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM', { locale: fr }), value: 0 })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const it of items) {
    if (!it.amount) continue
    try {
      const key = format(parseISO(it.date), 'yyyy-MM')
      const b = byKey.get(key)
      if (b) b.value += it.amount
    } catch {
      /* date invalide ignorée */
    }
  }
  return buckets.map((b) => ({ label: b.label, value: Math.round(b.value) }))
}

function ExpenseForm({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState('Réparation')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const save = async () => {
    if (!amount) return window.alert('Indiquez le montant.')
    await db.expenses.add({
      vehicleId: vehicle.id!,
      date,
      category,
      amount: Number(amount),
      notes: notes.trim() || undefined,
      createdAt: nowISO(),
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle dépense"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Montant (€)">
          <input type="number" inputMode="decimal" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
      </div>
      <Field label="Catégorie">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optionnel" />
      </Field>
    </Modal>
  )
}
