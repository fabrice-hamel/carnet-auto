// Génération d'un fichier .ics (calendrier) importable dans Google Agenda, Apple Calendar, etc.

export interface CalEvent {
  uid: string
  title: string
  date: string // 'yyyy-MM-dd' (événement sur la journée)
  description?: string
  /** nombre de jours avant pour le rappel (alarme) */
  alarmDaysBefore?: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateValue(iso: string): string {
  return iso.replace(/-/g, '') // yyyymmdd
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function stamp(): string {
  const d = new Date()
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function nextDayValue(iso: string): string {
  // Calcul en UTC pur pour éviter tout décalage de fuseau horaire (DTEND exclusif = lendemain).
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`
}

export function generateICS(events: CalEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carnet Auto//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  const dtstamp = stamp()
  for (const e of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${e.uid}@carnet-auto`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${toDateValue(e.date)}`)
    lines.push(`DTEND;VALUE=DATE:${nextDayValue(e.date)}`)
    lines.push(`SUMMARY:${escapeText(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    if (e.alarmDaysBefore && e.alarmDaysBefore > 0) {
      lines.push('BEGIN:VALARM')
      lines.push('ACTION:DISPLAY')
      lines.push(`DESCRIPTION:${escapeText(e.title)}`)
      lines.push(`TRIGGER:-P${e.alarmDaysBefore}D`)
      lines.push('END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
