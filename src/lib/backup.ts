import { db, getSettings, saveSettings } from '../db/db'
import { downloadText } from './files'
import { format } from 'date-fns'

const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'carnet-auto'
  version: number
  exportedAt: string
  includesPhotos: boolean
  data: {
    vehicles: unknown[]
    tasks: unknown[]
    services: unknown[]
    fuel: unknown[]
    expenses: unknown[]
    deadlines: unknown[]
    documents: unknown[]
    settings: unknown[]
  }
}

export async function exportBackup(includePhotos: boolean): Promise<void> {
  const [vehicles, tasks, services, fuel, expenses, deadlines, documents, settings] =
    await Promise.all([
      db.vehicles.toArray(),
      db.tasks.toArray(),
      db.services.toArray(),
      db.fuel.toArray(),
      db.expenses.toArray(),
      db.deadlines.toArray(),
      includePhotos ? db.documents.toArray() : Promise.resolve([]),
      db.settings.toArray(),
    ])

  // Si on n'inclut pas les photos, on retire aussi les photos de véhicules.
  const cleanVehicles = includePhotos ? vehicles : vehicles.map((v) => ({ ...v, photo: undefined }))

  const backup: BackupFile = {
    app: 'carnet-auto',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    data: {
      vehicles: cleanVehicles,
      tasks,
      services,
      fuel,
      expenses,
      deadlines,
      documents,
      settings,
    },
  }

  const stamp = format(new Date(), 'yyyy-MM-dd_HHmm')
  const suffix = includePhotos ? 'complet' : 'leger'
  downloadText(
    `carnet-auto_sauvegarde_${stamp}_${suffix}.json`,
    JSON.stringify(backup),
    'application/json',
  )
}

export interface ImportResult {
  ok: boolean
  message: string
}

export async function importBackup(jsonText: string, mode: 'replace' | 'merge'): Promise<ImportResult> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { ok: false, message: 'Fichier illisible (JSON invalide).' }
  }
  if (parsed.app !== 'carnet-auto' || !parsed.data) {
    return { ok: false, message: "Ce fichier n'est pas une sauvegarde Carnet Auto." }
  }

  const d = parsed.data
  try {
    await db.transaction(
      'rw',
      [db.vehicles, db.tasks, db.services, db.fuel, db.expenses, db.deadlines, db.documents, db.settings],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.vehicles.clear(),
            db.tasks.clear(),
            db.services.clear(),
            db.fuel.clear(),
            db.expenses.clear(),
            db.deadlines.clear(),
            db.documents.clear(),
          ])
        }
        // En mode "replace" on conserve les clés ; en "merge" on laisse Dexie réattribuer les id
        // pour éviter les collisions (les liens documentIds peuvent alors différer).
        const strip = (rows: any[]) =>
          mode === 'merge' ? rows.map(({ id, ...rest }) => rest) : rows
        await db.vehicles.bulkPut(strip(d.vehicles as any[]))
        await db.tasks.bulkPut(strip(d.tasks as any[]))
        await db.services.bulkPut(strip(d.services as any[]))
        await db.fuel.bulkPut(strip(d.fuel as any[]))
        await db.expenses.bulkPut(strip(d.expenses as any[]))
        await db.deadlines.bulkPut(strip(d.deadlines as any[]))
        if (d.documents?.length) await db.documents.bulkPut(strip(d.documents as any[]))
        if (mode === 'replace' && d.settings?.length) {
          await db.settings.bulkPut(d.settings as any[])
        }
      },
    )
    // S'assure que les réglages existent.
    const s = await getSettings()
    await saveSettings(s)
    return {
      ok: true,
      message: `Sauvegarde importée${parsed.includesPhotos ? ' (avec photos)' : ' (sans photos)'}.`,
    }
  } catch (e) {
    return { ok: false, message: 'Erreur pendant l’import : ' + (e as Error).message }
  }
}
