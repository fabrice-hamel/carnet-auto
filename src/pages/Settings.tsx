import { useState } from 'react'
import { Download, Upload, Sun, Moon, Monitor, Trash2, Info } from 'lucide-react'
import { db, saveSettings } from '../db/db'
import { useSettings } from '../lib/useSettings'
import { getStoredTheme, setTheme, type ThemeMode } from '../lib/theme'
import { exportBackup, importBackup } from '../lib/backup'
import { pickFile } from '../lib/files'
import { Field, ConfirmButton } from '../components/ui'

export default function SettingsPage() {
  const settings = useSettings()
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme())
  const [msg, setMsg] = useState<string | null>(null)

  const changeTheme = (m: ThemeMode) => {
    setTheme(m)
    setThemeState(m)
    saveSettings({ theme: m })
  }

  const doImport = async () => {
    const file = await pickFile('application/json,.json')
    if (!file) return
    const text = await file.text()
    const mode = window.confirm(
      'Remplacer toutes les données actuelles par la sauvegarde ?\n\nOK = Remplacer (recommandé sur un nouveau téléphone)\nAnnuler = Fusionner avec les données existantes',
    )
      ? 'replace'
      : 'merge'
    const res = await importBackup(text, mode)
    setMsg(res.message)
  }

  const resetAll = async () => {
    await Promise.all([
      db.vehicles.clear(),
      db.tasks.clear(),
      db.services.clear(),
      db.fuel.clear(),
      db.expenses.clear(),
      db.deadlines.clear(),
      db.documents.clear(),
    ])
    setMsg('Toutes les données ont été effacées.')
  }

  return (
    <div className="mt-2">
      <h1 className="mb-4 text-2xl font-bold">Réglages</h1>

      {msg && (
        <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-600/15 dark:text-brand-200">
          {msg}
        </div>
      )}

      {/* Apparence */}
      <section className="card p-4">
        <h2 className="mb-3 font-bold">Apparence</h2>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: 'light', label: 'Clair', icon: Sun },
              { v: 'dark', label: 'Sombre', icon: Moon },
              { v: 'system', label: 'Système', icon: Monitor },
            ] as const
          ).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => changeTheme(v)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-medium transition ${
                theme === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              <Icon size={20} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Seuils d'alerte */}
      <section className="card mt-4 p-4">
        <h2 className="mb-3 font-bold">Seuils d'alerte « Bientôt »</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jours avant échéance">
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={settings.soonDays}
              onChange={(e) => saveSettings({ soonDays: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Km avant échéance">
            <input
              type="number"
              inputMode="numeric"
              className="input"
              value={settings.soonKm}
              onChange={(e) => saveSettings({ soonKm: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
      </section>

      {/* Sauvegarde */}
      <section className="card mt-4 p-4">
        <h2 className="mb-1 font-bold">Sauvegarde & restauration</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Exportez un fichier puis déposez-le dans votre Google Drive. Lors d'un changement de téléphone,
          réimportez ce fichier pour tout récupérer.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => { exportBackup(true); setMsg('Sauvegarde complète exportée (avec photos).') }}>
            <Download size={18} /> Exporter (complet)
          </button>
          <button className="btn-ghost" onClick={() => { exportBackup(false); setMsg('Sauvegarde légère exportée (sans photos).') }}>
            <Download size={18} /> Léger (sans photos)
          </button>
          <button className="btn-ghost" onClick={doImport}>
            <Upload size={18} /> Importer
          </button>
        </div>
      </section>

      {/* Zone dangereuse */}
      <section className="card mt-4 p-4">
        <h2 className="mb-3 font-bold text-red-600 dark:text-red-400">Zone dangereuse</h2>
        <ConfirmButton
          label={<><Trash2 size={16} /> Effacer toutes les données</>}
          confirmText="Effacer TOUTES les données (véhicules, entretien, dépenses, documents) ? Pensez à exporter une sauvegarde avant. Irréversible."
          onConfirm={resetAll}
        />
      </section>

      <section className="mt-6 flex items-start gap-2 px-1 text-xs text-slate-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Carnet Auto v1.0 — application 100 % locale (vos données restent sur cet appareil). Installez-la
          via le menu « Ajouter à l'écran d'accueil » de votre navigateur pour un usage hors-ligne.
        </p>
      </section>
    </div>
  )
}
