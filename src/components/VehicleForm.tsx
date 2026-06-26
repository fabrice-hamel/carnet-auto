import { useState } from 'react'
import { Modal, Field } from './ui'
import type { FuelType, Vehicle } from '../db/types'
import { todayISO } from '../lib/format'
import { fileToCompressedDataURL, pickFile } from '../lib/files'

const FUELS: { value: FuelType; label: string }[] = [
  { value: 'essence', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'gpl', label: 'GPL' },
]

export type VehicleDraft = Omit<Vehicle, 'id' | 'createdAt'>

export default function VehicleForm({
  open,
  onClose,
  initial,
  onSave,
  isNew,
}: {
  open: boolean
  onClose: () => void
  initial?: Vehicle
  isNew: boolean
  onSave: (draft: VehicleDraft, seedPresets: boolean) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [make, setMake] = useState(initial?.make ?? 'Volvo')
  const [model, setModel] = useState(initial?.model ?? 'XC60')
  const [plate, setPlate] = useState(initial?.plate ?? '')
  const [vin, setVin] = useState(initial?.vin ?? '')
  const [fuel, setFuel] = useState<FuelType>(initial?.fuel ?? 'diesel')
  const [firstRegistration, setFirstRegistration] = useState(initial?.firstRegistration ?? '')
  const [currentMileage, setCurrentMileage] = useState(String(initial?.currentMileage ?? ''))
  const [mileageDate, setMileageDate] = useState(initial?.mileageDate ?? todayISO())
  const [avgKmPerYear, setAvgKmPerYear] = useState(String(initial?.avgKmPerYear ?? 15000))
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [seedPresets, setSeedPresets] = useState(true)

  const addPhoto = async () => {
    const file = await pickFile('image/*')
    if (file) setPhoto(await fileToCompressedDataURL(file, 800, 0.7))
  }

  const submit = () => {
    if (!name.trim() || !make.trim() || !model.trim()) {
      window.alert('Nom, marque et modèle sont obligatoires.')
      return
    }
    onSave(
      {
        name: name.trim(),
        make: make.trim(),
        model: model.trim(),
        plate: plate.trim() || undefined,
        vin: vin.trim() || undefined,
        fuel,
        firstRegistration: firstRegistration || undefined,
        currentMileage: Number(currentMileage) || 0,
        mileageDate,
        avgKmPerYear: Number(avgKmPerYear) || 0,
        photo,
        archived: initial?.archived ?? false,
      },
      seedPresets,
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Nouveau véhicule' : 'Modifier le véhicule'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" onClick={submit}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <button
          onClick={addPhoto}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs text-slate-400 dark:bg-white/5"
        >
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : 'Photo'}
        </button>
        <div className="flex-1">
          <Field label="Nom (surnom)">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. XC60 familiale" />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marque">
          <input className="input" value={make} onChange={(e) => setMake(e.target.value)} />
        </Field>
        <Field label="Modèle">
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Motorisation">
          <select className="input" value={fuel} onChange={(e) => setFuel(e.target.value as FuelType)}>
            {FUELS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Immatriculation">
          <input className="input" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="AA-123-BB" />
        </Field>
      </div>

      <Field label="1ère immatriculation" hint="Sert à calculer le contrôle technique (4 ans puis tous les 2 ans).">
        <input type="date" className="input" value={firstRegistration} onChange={(e) => setFirstRegistration(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kilométrage actuel">
          <input type="number" inputMode="numeric" className="input" value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} placeholder="km" />
        </Field>
        <Field label="Relevé le">
          <input type="date" className="input" value={mileageDate} onChange={(e) => setMileageDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Km parcourus par an" hint="Estimation pour anticiper les échéances kilométriques.">
        <input type="number" inputMode="numeric" className="input" value={avgKmPerYear} onChange={(e) => setAvgKmPerYear(e.target.value)} />
      </Field>

      <Field label="N° de série (VIN)">
        <input className="input" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="optionnel" />
      </Field>

      {isNew && (
        <label className="mt-1 flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
          <input type="checkbox" checked={seedPresets} onChange={(e) => setSeedPresets(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            Pré-remplir le plan d'entretien type{' '}
            {make.toLowerCase() === 'volvo' && model.toLowerCase().replace(/\s/g, '') === 'xc60'
              ? '(Volvo XC60)'
              : '(générique)'}{' '}
            — modifiable ensuite.
          </span>
        </label>
      )}
    </Modal>
  )
}
