import { differenceInCalendarDays, parseISO } from 'date-fns'
import { addMonths, format } from 'date-fns'
import type { Deadline, MaintenanceTask, Settings, Vehicle } from '../db/types'

export type Urgency = 'overdue' | 'soon' | 'ok' | 'unknown'

export const URGENCY_RANK: Record<Urgency, number> = { overdue: 3, soon: 2, ok: 1, unknown: 0 }

export function worstUrgency(a: Urgency, b: Urgency): Urgency {
  return URGENCY_RANK[a] >= URGENCY_RANK[b] ? a : b
}

/** Estime le kilométrage actuel à partir du dernier relevé et de la moyenne km/an. */
export function estimatedMileage(vehicle: Vehicle, on: Date = new Date()): number {
  if (!vehicle.mileageDate || !vehicle.avgKmPerYear) return vehicle.currentMileage
  const days = differenceInCalendarDays(on, parseISO(vehicle.mileageDate))
  if (days <= 0) return vehicle.currentMileage
  return Math.round(vehicle.currentMileage + (vehicle.avgKmPerYear / 365) * days)
}

export interface TaskComputed {
  dueKm?: number
  dueDate?: string
  kmRemaining?: number
  daysRemaining?: number
  urgency: Urgency
  /** Date estimée à laquelle la limite km sera atteinte (pour le calendrier). */
  kmDueEstimatedDate?: string
}

export function computeTask(
  task: MaintenanceTask,
  vehicle: Vehicle,
  settings: Settings,
): TaskComputed {
  const estKm = estimatedMileage(vehicle)
  let kmUrgency: Urgency = 'unknown'
  let timeUrgency: Urgency = 'unknown'
  const out: TaskComputed = { urgency: 'unknown' }

  // Échéance kilométrique
  if (task.intervalKm && task.lastDoneKm !== undefined) {
    const dueKm = task.lastDoneKm + task.intervalKm
    out.dueKm = dueKm
    const kmRemaining = dueKm - estKm
    out.kmRemaining = kmRemaining
    kmUrgency = kmRemaining <= 0 ? 'overdue' : kmRemaining <= settings.soonKm ? 'soon' : 'ok'
    // estimation de la date où le seuil km sera franchi
    if (vehicle.avgKmPerYear > 0) {
      const daysToKm = (kmRemaining / vehicle.avgKmPerYear) * 365
      out.kmDueEstimatedDate = format(addDays(new Date(), daysToKm), 'yyyy-MM-dd')
    }
  }

  // Échéance temporelle
  if (task.intervalMonths && task.lastDoneDate) {
    const dueDate = format(addMonths(parseISO(task.lastDoneDate), task.intervalMonths), 'yyyy-MM-dd')
    out.dueDate = dueDate
    const days = differenceInCalendarDays(parseISO(dueDate), new Date())
    out.daysRemaining = days
    timeUrgency = days < 0 ? 'overdue' : days <= settings.soonDays ? 'soon' : 'ok'
  }

  out.urgency = worstUrgency(kmUrgency, timeUrgency)
  return out
}

export interface DeadlineComputed {
  daysRemaining: number
  urgency: Urgency
}

export function computeDeadline(deadline: Deadline, settings: Settings): DeadlineComputed {
  const days = differenceInCalendarDays(parseISO(deadline.dueDate), new Date())
  const urgency: Urgency = days < 0 ? 'overdue' : days <= settings.soonDays ? 'soon' : 'ok'
  return { daysRemaining: days, urgency }
}

// petite aide locale pour éviter un import circulaire
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + Math.round(days))
  return d
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'En retard',
  soon: 'Bientôt',
  ok: 'À jour',
  unknown: 'À renseigner',
}
