import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, FileText, Image as ImageIcon } from 'lucide-react'
import { db } from '../../db/db'
import type { DocumentType, Vehicle } from '../../db/types'
import { Modal, Field, EmptyState, ConfirmButton } from '../ui'
import { formatDate, todayISO, nowISO } from '../../lib/format'
import { fileToCompressedDataURL, pickFile } from '../../lib/files'

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'facture', label: 'Facture' },
  { value: 'carte_grise', label: 'Carte grise' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'controle_technique', label: 'Contrôle technique' },
  { value: 'photo', label: 'Photo' },
  { value: 'autre', label: 'Autre' },
]

function typeLabel(t: DocumentType) {
  return DOC_TYPES.find((d) => d.value === t)?.label ?? t
}

export default function DocumentsTab({ vehicle }: { vehicle: Vehicle }) {
  const docs = useLiveQuery(() => db.documents.where('vehicleId').equals(vehicle.id!).toArray(), [vehicle.id])
  const [adding, setAdding] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  if (!docs) return null

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Documents</h2>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setAdding(true)}>
          <Plus size={16} /> Document
        </button>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title="Aucun document" hint="Photographiez factures, carte grise, attestation d'assurance, rapport de CT…" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docs.map((d) => (
            <div key={d.id} className="card overflow-hidden">
              <button onClick={() => setPreview(d.dataUrl)} className="block aspect-[4/3] w-full bg-slate-100 dark:bg-white/5">
                <img src={d.dataUrl} alt={d.title} className="h-full w-full object-cover" />
              </button>
              <div className="flex items-start gap-1 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {typeLabel(d.type)} · {formatDate(d.date)}
                  </p>
                </div>
                <ConfirmButton
                  label={<Trash2 size={13} />}
                  className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  confirmText="Supprimer ce document ?"
                  onConfirm={() => db.documents.delete(d.id!)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && <DocForm vehicle={vehicle} onClose={() => setAdding(false)} />}

      {preview && (
        <Modal open onClose={() => setPreview(null)} title="Aperçu">
          <img src={preview} alt="" className="mx-auto max-h-[70vh] rounded-xl" />
        </Modal>
      )}
    </div>
  )
}

function DocForm({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<DocumentType>('facture')
  const [date, setDate] = useState(todayISO())
  const [dataUrl, setDataUrl] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const choose = async () => {
    const file = await pickFile('image/*')
    if (!file) return
    setBusy(true)
    try {
      setDataUrl(await fileToCompressedDataURL(file, 1600, 0.72))
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!dataUrl) return window.alert('Ajoutez une image.')
    await db.documents.add({
      vehicleId: vehicle.id!,
      type,
      title: title.trim() || typeLabel(type),
      date,
      dataUrl,
      createdAt: nowISO(),
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouveau document"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <button onClick={choose} className="mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
        {dataUrl ? (
          <img src={dataUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm">
            <ImageIcon size={32} /> {busy ? 'Chargement…' : 'Choisir / prendre une photo'}
          </span>
        )}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Titre">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Facture vidange janvier" />
      </Field>
    </Modal>
  )
}
