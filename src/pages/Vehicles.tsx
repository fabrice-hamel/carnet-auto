import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Plus, Car, ChevronRight, Gauge } from 'lucide-react'
import { db } from '../db/db'
import { createVehicleWithDefaults } from '../db/repo'
import VehicleForm, { type VehicleDraft } from '../components/VehicleForm'
import { EmptyState } from '../components/ui'
import { estimatedMileage } from '../lib/scheduling'
import { formatKm } from '../lib/format'

export default function Vehicles() {
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), [])
  const [adding, setAdding] = useState(false)

  const handleCreate = async (draft: VehicleDraft, seedPresets: boolean) => {
    await createVehicleWithDefaults(draft, { seedPresets })
    setAdding(false)
  }

  return (
    <div className="mt-2">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Véhicules</h1>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={18} /> Ajouter
        </button>
      </div>

      {!vehicles ? (
        <div className="mt-10 text-center text-slate-400">Chargement…</div>
      ) : vehicles.length === 0 ? (
        <EmptyState icon={<Car size={48} />} title="Aucun véhicule" hint="Ajoutez votre première voiture pour commencer." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/vehicules/${v.id}`} className="card flex items-center gap-3 p-3.5 transition hover:ring-brand-300">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
                {v.photo ? <img src={v.photo} alt="" className="h-full w-full object-cover" /> : <Car className="text-slate-400" size={26} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{v.name}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {v.make} {v.model}
                  {v.plate ? ` · ${v.plate}` : ''}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <Gauge size={12} /> {formatKm(estimatedMileage(v))} (estimé)
                </p>
              </div>
              <ChevronRight className="text-slate-300" />
            </Link>
          ))}
        </div>
      )}

      <VehicleForm open={adding} isNew onClose={() => setAdding(false)} onSave={handleCreate} />
    </div>
  )
}
