import Dexie, { type Table } from 'dexie'
import type {
  Vehicle,
  MaintenanceTask,
  ServiceRecord,
  FuelEntry,
  Expense,
  Deadline,
  DocumentBlob,
  Settings,
} from './types'

export class CarnetAutoDB extends Dexie {
  vehicles!: Table<Vehicle, number>
  tasks!: Table<MaintenanceTask, number>
  services!: Table<ServiceRecord, number>
  fuel!: Table<FuelEntry, number>
  expenses!: Table<Expense, number>
  deadlines!: Table<Deadline, number>
  documents!: Table<DocumentBlob, number>
  settings!: Table<Settings, number>

  constructor() {
    super('carnet-auto')
    this.version(1).stores({
      vehicles: '++id, name, archived',
      tasks: '++id, vehicleId, active',
      services: '++id, vehicleId, date, taskId',
      fuel: '++id, vehicleId, date',
      expenses: '++id, vehicleId, date, category',
      deadlines: '++id, vehicleId, type, dueDate',
      documents: '++id, vehicleId, type',
      settings: '++id',
    })
  }
}

export const db = new CarnetAutoDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  theme: 'system',
  soonDays: 30,
  soonKm: 1000,
}

/** Lecture seule : ne fait aucune écriture (évite les effets de bord dans les requêtes réactives). */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(1)
  return s ?? DEFAULT_SETTINGS
}

/** Crée la ligne de réglages si absente. À appeler une fois au démarrage. */
export async function ensureSettings(): Promise<void> {
  const s = await db.settings.get(1)
  if (!s) await db.settings.put(DEFAULT_SETTINGS)
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 1 })
}
