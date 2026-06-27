import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Pencil, Trash2, Gauge, Wrench, Fuel, Receipt, FileText } from 'lucide-react'
import { db } from '../db/db'
import { deleteVehicleCascade } from '../db/repo'
import VehicleForm, { type VehicleDraft } from '../components/VehicleForm'
import { Modal, Field, ConfirmButton } from '../components/ui'
import { estimatedMileage } from '../lib/scheduling'
import { formatKm, formatDate, todayISO } from '../lib/format'
import MaintenanceTab from '../components/tabs/MaintenanceTab'
import FuelTab from '../components/tabs/FuelTab'
import ExpensesTab from '../components/tabs/ExpensesTab'
import DocumentsTab from '../components/tabs/DocumentsTab'

const TABS = [
  { key: 'entretien', label: 'Entretien', icon: Wrench },
  { key: 'carburant', label: 'Carburant', icon: Fuel },
  { key: 'depenses', label: 'Dépenses', icon: Receipt },
  { key: 'documents', label: 'Documents', icon: FileText },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function VehicleDetail() {
  const { id } = useParams()
  const vehicleId = Number(id)
  const navigate = useNavigate()
  const vehicle = useLiveQuery(() => db.vehicles.get(vehicleId), [vehicleId])
  const [tab, setTab] = useState<TabKey>('entretien')
  const [editing, setEditing] = useState(false)
  const [mileageOpen, setMileageOpen] = useState(false)

  if (vehicle === undefined) return <div className="mt-10 text-center text-slate-400">Chargement…</div>
  if (vehicle === null)
    return (
      <div className="mt-10 text-center">
        <p className="text-slate-400">Véhicule introuvable.</p>
        <Link to="/vehicules" className="btn-ghost mt-3">
          Retour
        </Link>
      </div>
    )

  const handleEdit = async (draft: VehicleDraft) => {
    await db.vehicles.update(vehicleId, draft)
    setEditing(false)
  }

  const handleDelete = async () => {
    await deleteVehicleCascade(vehicleId)
    navigate('/vehicules')
  }

  return (
    <div className="mt-2">
      <button onClick={() => navigate('/vehicules')} className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500">
        <ArrowLeft size={16} /> Véhicules
      </button>

      {/* En-tête véhicule */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
            {vehicle.photo ? <img src={vehicle.photo} alt="" className="h-full w-full object-cover" /> : <Gauge className="text-slate-400" size={28} />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{vehicle.name}</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {vehicle.make} {vehicle.model}
              {vehicle.plate ? ` · ${vehicle.plate}` : ''}
            </p>
          </div>
          <div className="flex gap-1">
            <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setEditing(true)} aria-label="Modifier">
              <Pencil size={18} />
            </button>
          </div>
        </div>
        <button
          onClick={() => setMileageOpen(true)}
          className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left dark:border-white/10"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Gauge size={16} /> Kilométrage
          </span>
          <span className="text-right">
            <span className="font-bold">{formatKm(vehicle.currentMileage)}</span>
            <span className="block text-xs text-slate-400">
              relevé {formatDate(vehicle.mileageDate)} · ~{formatKm(estimatedMileage(vehicle))} aujourd'hui
            </span>
          </span>
        </button>
      </div>

      {/* Onglets */}
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'entretien' && <MaintenanceTab vehicle={vehicle} />}
        {tab === 'carburant' && <FuelTab vehicle={vehicle} />}
        {tab === 'depenses' && <ExpensesTab vehicle={vehicle} />}
        {tab === 'documents' && <DocumentsTab vehicle={vehicle} />}
      </div>

      <div className="mt-10 border-t border-slate-100 pt-4 dark:border-white/10">
        <ConfirmButton
          label={
            <>
              <Trash2 size={16} /> Supprimer ce véhicule
            </>
          }
          confirmText={`Supprimer "${vehicle.name}" et toutes ses données ? Cette action est irréversible.`}
          onConfirm={handleDelete}
        />
      </div>

      <VehicleForm open={editing} isNew={false} initial={vehicle} onClose={() => setEditing(false)} onSave={handleEdit} />
      {mileageOpen && <MileageModal vehicleId={vehicleId} current={vehicle.currentMileage} onClose={() => setMileageOpen(false)} />}
    </div>
  )
}

function MileageModal({ vehicleId, current, onClose }: { vehicleId: number; current: number; onClose: () => void }) {
  const [km, setKm] = useState(String(current))
  const [date, setDate] = useState(todayISO())
  const save = async () => {
    await db.vehicles.update(vehicleId, { currentMileage: Number(km) || 0, mileageDate: date })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Mettre à jour le kilométrage"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" onClick={save}>
            Enregistrer
          </button>
        </>
      }
    >
      <Field label="Kilométrage relevé">
        <input type="number" inputMode="numeric" className="input" value={km} onChange={(e) => setKm(e.target.value)} autoFocus />
      </Field>
      <Field label="Date du relevé">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </Modal>
  )
}
