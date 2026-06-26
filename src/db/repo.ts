import { db } from './db'
import { nowISO, todayISO } from '../lib/format'
import { presetTasksFor } from '../lib/presets'
import { firstCTDate, nextCTAfter, CT_RECURRENCE_MONTHS } from '../lib/ct'
import type { Vehicle } from './types'

/** Crée un véhicule, sème les tâches d'entretien préréglées et l'échéance de contrôle technique. */
export async function createVehicleWithDefaults(
  vehicle: Omit<Vehicle, 'id' | 'createdAt'>,
  options: { seedPresets: boolean },
): Promise<number> {
  const id = await db.vehicles.add({ ...vehicle, createdAt: nowISO() })

  if (options.seedPresets) {
    const presets = presetTasksFor(vehicle.make, vehicle.model, vehicle.fuel)
    await db.tasks.bulkAdd(
      presets.map((p) => ({
        vehicleId: id,
        title: p.title,
        category: p.category,
        intervalKm: p.intervalKm,
        intervalMonths: p.intervalMonths,
        active: true,
        createdAt: nowISO(),
      })),
    )
  }

  // Échéance de contrôle technique (si on connaît la 1ère immatriculation).
  if (vehicle.firstRegistration) {
    await db.deadlines.add({
      vehicleId: id,
      type: 'controle_technique',
      title: 'Contrôle technique',
      dueDate: firstCTDate(vehicle.firstRegistration),
      recurrenceMonths: CT_RECURRENCE_MONTHS,
      notes: '1ère visite à 4 ans puis tous les 2 ans.',
      createdAt: nowISO(),
    })
  }

  return id
}

/** Supprime un véhicule et toutes ses données liées. */
export async function deleteVehicleCascade(vehicleId: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.vehicles, db.tasks, db.services, db.fuel, db.expenses, db.deadlines, db.documents],
    async () => {
      await db.tasks.where('vehicleId').equals(vehicleId).delete()
      await db.services.where('vehicleId').equals(vehicleId).delete()
      await db.fuel.where('vehicleId').equals(vehicleId).delete()
      await db.expenses.where('vehicleId').equals(vehicleId).delete()
      await db.deadlines.where('vehicleId').equals(vehicleId).delete()
      await db.documents.where('vehicleId').equals(vehicleId).delete()
      await db.vehicles.delete(vehicleId)
    },
  )
}

/** Enregistre une intervention et met à jour la tâche d'entretien + le kilométrage du véhicule. */
export async function completeTask(params: {
  vehicleId: number
  taskId?: number
  date: string
  mileage: number
  title: string
  cost?: number
  vendor?: string
  notes?: string
}): Promise<void> {
  await db.transaction('rw', [db.services, db.tasks, db.vehicles], async () => {
    await db.services.add({
      vehicleId: params.vehicleId,
      taskId: params.taskId,
      date: params.date,
      mileage: params.mileage,
      title: params.title,
      cost: params.cost,
      vendor: params.vendor,
      notes: params.notes,
      createdAt: nowISO(),
    })
    if (params.taskId) {
      await db.tasks.update(params.taskId, {
        lastDoneDate: params.date,
        lastDoneKm: params.mileage,
      })
    }
    // Met à jour le kilométrage du véhicule si l'intervention est plus récente.
    const v = await db.vehicles.get(params.vehicleId)
    if (v && params.mileage > v.currentMileage) {
      await db.vehicles.update(params.vehicleId, {
        currentMileage: params.mileage,
        mileageDate: params.date || todayISO(),
      })
    }
  })
}

/** Valide un contrôle technique : reporte l'échéance à +24 mois. */
export async function validateCT(deadlineId: number, passedDateISO: string): Promise<void> {
  const dl = await db.deadlines.get(deadlineId)
  if (!dl) return
  await db.deadlines.update(deadlineId, { dueDate: nextCTAfter(passedDateISO) })
}
