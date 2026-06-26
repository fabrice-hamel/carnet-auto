import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { CalendarPlus, CheckCircle2, Car, Bell } from 'lucide-react'
import { db } from '../db/db'
import { useSettings } from '../lib/useSettings'
import { buildAlerts } from '../lib/alerts'
import { StatusBadge, EmptyState, urgencyDot } from '../components/ui'
import { generateICS } from '../lib/ics'
import { downloadText } from '../lib/files'

export default function Dashboard() {
  const settings = useSettings()
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), [])
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const deadlines = useLiveQuery(() => db.deadlines.toArray(), [])

  if (!vehicles || !tasks || !deadlines) return <Loading />

  const activeVehicles = vehicles.filter((v) => !v.archived)
  const alerts = buildAlerts(vehicles, tasks, deadlines, settings)
  const actionable = alerts.filter((a) => a.urgency === 'overdue' || a.urgency === 'soon')
  const overdue = actionable.filter((a) => a.urgency === 'overdue').length
  const soon = actionable.filter((a) => a.urgency === 'soon').length

  const exportCalendar = () => {
    const events = alerts
      .filter((a) => a.calDate)
      .map((a) => ({
        uid: a.id,
        title: `${a.title} — ${a.vehicleName}`,
        date: a.calDate!,
        description: a.detail,
        alarmDaysBefore: 14,
      }))
    if (!events.length) {
      window.alert('Aucune échéance à exporter pour le moment.')
      return
    }
    downloadText('carnet-auto_echeances.ics', generateICS(events), 'text/calendar')
  }

  if (activeVehicles.length === 0) {
    return (
      <div className="mt-4">
        <h1 className="mb-4 text-2xl font-bold">Tableau de bord</h1>
        <EmptyState
          icon={<Car size={48} />}
          title="Aucun véhicule"
          hint="Ajoutez votre première voiture pour suivre son entretien et son contrôle technique."
        />
        <div className="mt-4 flex justify-center">
          <Link to="/vehicules" className="btn-primary">
            <Car size={18} /> Ajouter un véhicule
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <button className="btn-ghost" onClick={exportCalendar} title="Exporter les échéances vers votre agenda">
          <CalendarPlus size={18} /> <span className="hidden sm:inline">Agenda</span>
        </button>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={overdue} label="En retard" tone="overdue" />
        <StatCard value={soon} label="Bientôt" tone="soon" />
        <StatCard value={activeVehicles.length} label="Véhicules" tone="neutral" />
      </div>

      {/* Liste des alertes */}
      <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Bell size={16} /> À surveiller
      </h2>

      {actionable.length === 0 ? (
        <div className="card flex items-center gap-3 p-5 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={28} />
          <div>
            <p className="font-semibold">Tout est à jour 🎉</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucune échéance proche ou dépassée.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {actionable.map((a) => (
            <Link
              key={a.id}
              to={`/vehicules/${a.vehicleId}`}
              className={`flex items-center gap-3 rounded-2xl border-l-4 p-3.5 shadow-sm ring-1 transition hover:brightness-105 ${alertTint(a.urgency)}`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${urgencyDot(a.urgency)}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.title}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {a.vehicleName} · {a.detail}
                </p>
              </div>
              <StatusBadge urgency={a.urgency} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function alertTint(urgency: 'overdue' | 'soon' | 'ok' | 'unknown'): string {
  switch (urgency) {
    case 'overdue':
      return 'border-red-500 bg-red-50 ring-red-100 dark:bg-red-500/10 dark:ring-red-500/20'
    case 'soon':
      return 'border-amber-500 bg-amber-50 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20'
    default:
      return 'border-brand-400 bg-white ring-slate-200 dark:bg-brand-900 dark:ring-white/10'
  }
}

function StatCard({ value, label, tone }: { value: number; label: string; tone: 'overdue' | 'soon' | 'neutral' }) {
  const styles = {
    overdue: {
      box: 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/20',
      sub: 'text-white/80',
    },
    soon: {
      box: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20',
      sub: 'text-white/85',
    },
    neutral: {
      box: 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/20',
      sub: 'text-white/80',
    },
  }[tone]
  return (
    <div className={`rounded-2xl p-4 text-center ${styles.box}`}>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className={`mt-1 text-xs font-medium ${styles.sub}`}>{label}</div>
    </div>
  )
}

function Loading() {
  return <div className="mt-10 text-center text-slate-400">Chargement…</div>
}
