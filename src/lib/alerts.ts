import type { Deadline, MaintenanceTask, Settings, Vehicle } from '../db/types'
import { computeDeadline, computeTask, URGENCY_RANK, type Urgency } from './scheduling'
import { formatDate, formatKm } from './format'

export interface Alert {
  id: string
  vehicleId: number
  vehicleName: string
  kind: 'task' | 'deadline'
  title: string
  urgency: Urgency
  dueDate?: string
  daysRemaining?: number
  kmRemaining?: number
  detail: string
  calDate?: string // meilleure date pour le calendrier
}

export function buildAlerts(
  vehicles: Vehicle[],
  tasks: MaintenanceTask[],
  deadlines: Deadline[],
  settings: Settings,
): Alert[] {
  const vById = new Map(vehicles.map((v) => [v.id!, v]))
  const alerts: Alert[] = []

  for (const t of tasks) {
    if (!t.active) continue
    const v = vById.get(t.vehicleId)
    if (!v || v.archived) continue
    const c = computeTask(t, v, settings)
    if (c.urgency === 'unknown') continue
    const parts: string[] = []
    if (c.daysRemaining !== undefined) {
      parts.push(c.daysRemaining < 0 ? `${-c.daysRemaining} j de retard` : `dans ${c.daysRemaining} j (${formatDate(c.dueDate)})`)
    }
    if (c.kmRemaining !== undefined) {
      parts.push(c.kmRemaining < 0 ? `${formatKm(-c.kmRemaining)} dépassés` : `${formatKm(c.kmRemaining)} restants`)
    }
    alerts.push({
      id: `task-${t.id}`,
      vehicleId: t.vehicleId,
      vehicleName: v.name,
      kind: 'task',
      title: t.title,
      urgency: c.urgency,
      dueDate: c.dueDate,
      daysRemaining: c.daysRemaining,
      kmRemaining: c.kmRemaining,
      detail: parts.join(' · '),
      calDate: c.dueDate ?? c.kmDueEstimatedDate,
    })
  }

  for (const d of deadlines) {
    const v = vById.get(d.vehicleId)
    if (!v || v.archived) continue
    const c = computeDeadline(d, settings)
    alerts.push({
      id: `deadline-${d.id}`,
      vehicleId: d.vehicleId,
      vehicleName: v.name,
      kind: 'deadline',
      title: d.title,
      urgency: c.urgency,
      dueDate: d.dueDate,
      daysRemaining: c.daysRemaining,
      detail:
        c.daysRemaining < 0
          ? `${-c.daysRemaining} j de retard (${formatDate(d.dueDate)})`
          : `dans ${c.daysRemaining} j (${formatDate(d.dueDate)})`,
      calDate: d.dueDate,
    })
  }

  // Tri : urgence décroissante puis échéance la plus proche.
  alerts.sort((a, b) => {
    if (URGENCY_RANK[b.urgency] !== URGENCY_RANK[a.urgency]) {
      return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
    }
    return (a.daysRemaining ?? 99999) - (b.daysRemaining ?? 99999)
  })

  return alerts
}
