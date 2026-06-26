import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, Droplet } from 'lucide-react'
import { db } from '../../db/db'
import type { FuelEntry, Vehicle } from '../../db/types'
import { Modal, Field, EmptyState, ConfirmButton } from '../ui'
import { formatKm, formatDate, formatMoney, formatNumber, todayISO, nowISO } from '../../lib/format'
import { LineChartCard } from '../charts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function FuelTab({ vehicle }: { vehicle: Vehicle }) {
  const entries = useLiveQuery(
    () => db.fuel.where('vehicleId').equals(vehicle.id!).reverse().sortBy('mileage'),
    [vehicle.id],
  )
  const [adding, setAdding] = useState(false)
  if (!entries) return null

  const isElectric = vehicle.fuel === 'electrique'
  const unit = isElectric ? 'kWh' : 'L'
  const stats = computeFuelStats(entries, isElectric)
  const consumptionSeries = computeConsumptionSeries(entries)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Carburant / recharge</h2>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Plein
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={<Droplet size={40} />} title="Aucun plein" hint={`Ajoutez vos pleins pour suivre la consommation (${unit}/100 km) et le coût au km.`} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Mini value={stats.avgConsumption !== undefined ? `${formatNumber(stats.avgConsumption)}` : '—'} label={`${unit}/100km`} />
            <Mini value={stats.costPerKm !== undefined ? formatMoney(stats.costPerKm) : '—'} label="par km" />
            <Mini value={formatMoney(stats.totalCost)} label="total" />
          </div>
          {consumptionSeries.length >= 2 && (
            <div className="card mb-4 p-3">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Consommation ({unit}/100 km)
              </p>
              <LineChartCard data={consumptionSeries} unit={`${unit}/100km`} />
            </div>
          )}
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="card flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {formatNumber(e.quantity)} {unit}
                    {e.totalCost ? ` · ${formatMoney(e.totalCost)}` : ''}
                    {e.fullTank ? '' : ' · partiel'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(e.date)} · {formatKm(e.mileage)}
                    {e.station ? ` · ${e.station}` : ''}
                  </p>
                </div>
                <ConfirmButton
                  label={<Trash2 size={14} />}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  confirmText="Supprimer ce plein ?"
                  onConfirm={() => db.fuel.delete(e.id!)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {adding && <FuelForm vehicle={vehicle} unit={unit} onClose={() => setAdding(false)} />}
    </div>
  )
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  )
}

/** Consommation par segment entre pleins complets successifs (pour le graphique). */
function computeConsumptionSeries(entries: FuelEntry[]): { label: string; value: number }[] {
  const byKm = entries.slice().sort((a, b) => a.mileage - b.mileage)
  const series: { label: string; value: number }[] = []
  let prevFullIdx = byKm.findIndex((e) => e.fullTank)
  if (prevFullIdx === -1) return series
  for (let i = prevFullIdx + 1; i < byKm.length; i++) {
    if (!byKm[i].fullTank) continue
    const prev = byKm[prevFullIdx]
    const curr = byKm[i]
    const distance = curr.mileage - prev.mileage
    if (distance > 0) {
      let liters = 0
      for (let j = prevFullIdx + 1; j <= i; j++) liters += byKm[j].quantity
      const cons = (liters / distance) * 100
      if (cons > 0 && cons < 100) {
        series.push({ label: format(parseISO(curr.date), 'd MMM', { locale: fr }), value: Math.round(cons * 10) / 10 })
      }
    }
    prevFullIdx = i
  }
  return series
}

function computeFuelStats(entries: FuelEntry[], _isElectric: boolean) {
  const totalCost = entries.reduce((s, e) => s + (e.totalCost ?? 0), 0)
  // Tri par km croissant pour la conso
  const byKm = entries.slice().sort((a, b) => a.mileage - b.mileage)
  // Consommation entre le premier et le dernier plein complet
  const fulls = byKm.filter((e) => e.fullTank)
  let avgConsumption: number | undefined
  let costPerKm: number | undefined
  if (fulls.length >= 2) {
    const first = fulls[0]
    const last = fulls[fulls.length - 1]
    const distance = last.mileage - first.mileage
    if (distance > 0) {
      // On compte le carburant ajouté après le premier plein (le premier sert de référence).
      const litersAfterFirst = byKm
        .filter((e) => e.mileage > first.mileage && e.mileage <= last.mileage)
        .reduce((s, e) => s + e.quantity, 0)
      avgConsumption = (litersAfterFirst / distance) * 100
      const costAfterFirst = byKm
        .filter((e) => e.mileage > first.mileage && e.mileage <= last.mileage)
        .reduce((s, e) => s + (e.totalCost ?? 0), 0)
      if (costAfterFirst > 0) costPerKm = costAfterFirst / distance
    }
  }
  return { totalCost, avgConsumption, costPerKm }
}

function FuelForm({ vehicle, unit, onClose }: { vehicle: Vehicle; unit: string; onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [mileage, setMileage] = useState(String(vehicle.currentMileage))
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [fullTank, setFullTank] = useState(true)
  const [station, setStation] = useState('')

  // Calcule le total si prix unitaire + quantité saisis et total vide
  const onQty = (v: string) => {
    setQuantity(v)
    if (unitPrice && v) setTotalCost((Number(v) * Number(unitPrice)).toFixed(2))
  }
  const onPrice = (v: string) => {
    setUnitPrice(v)
    if (quantity && v) setTotalCost((Number(quantity) * Number(v)).toFixed(2))
  }

  const save = async () => {
    if (!quantity) return window.alert('Indiquez la quantité.')
    await db.fuel.add({
      vehicleId: vehicle.id!,
      date,
      mileage: Number(mileage) || 0,
      quantity: Number(quantity),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      totalCost: totalCost ? Number(totalCost) : undefined,
      fullTank,
      station: station.trim() || undefined,
      createdAt: nowISO(),
    })
    if (Number(mileage) > vehicle.currentMileage) {
      await db.vehicles.update(vehicle.id!, { currentMileage: Number(mileage), mileageDate: date })
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouveau plein"
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
        <Field label="Kilométrage">
          <input type="number" inputMode="numeric" className="input" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={`Quantité (${unit})`}>
          <input type="number" inputMode="decimal" className="input" value={quantity} onChange={(e) => onQty(e.target.value)} autoFocus />
        </Field>
        <Field label="Prix /unité">
          <input type="number" inputMode="decimal" className="input" value={unitPrice} onChange={(e) => onPrice(e.target.value)} />
        </Field>
        <Field label="Total €">
          <input type="number" inputMode="decimal" className="input" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
        </Field>
      </div>
      <Field label="Station">
        <input className="input" value={station} onChange={(e) => setStation(e.target.value)} placeholder="optionnel" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} className="h-4 w-4" /> Plein complet
        <span className="text-xs text-slate-400">(nécessaire au calcul de consommation)</span>
      </label>
    </Modal>
  )
}
