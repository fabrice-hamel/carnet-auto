import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy', { locale: fr })
  } catch {
    return iso
  }
}

export function formatKm(km?: number): string {
  if (km === undefined || km === null || Number.isNaN(km)) return '—'
  return new Intl.NumberFormat('fr-FR').format(Math.round(km)) + ' km'
}

export function formatMoney(amount?: number): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatNumber(n?: number, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n)
}
