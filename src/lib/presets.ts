import type { FuelType, MaintenanceTask } from '../db/types'

// Préréglages d'entretien indicatifs pour un Volvo XC60 (à ajuster selon motorisation/année
// et carnet d'entretien Volvo). Valeurs en km et/ou mois. Tous modifiables dans l'app.
type PresetTask = Pick<MaintenanceTask, 'title' | 'category' | 'intervalKm' | 'intervalMonths'> & {
  fuels?: FuelType[] // si défini, ne s'applique qu'à ces motorisations
}

const XC60_PRESETS: PresetTask[] = [
  { title: 'Vidange moteur + filtre à huile', category: 'Moteur', intervalKm: 30000, intervalMonths: 12 },
  { title: "Filtre d'habitacle", category: 'Filtres', intervalKm: 30000, intervalMonths: 12 },
  { title: 'Filtre à air', category: 'Filtres', intervalKm: 60000, intervalMonths: 24 },
  {
    title: 'Filtre à carburant',
    category: 'Filtres',
    intervalKm: 60000,
    intervalMonths: 48,
    fuels: ['diesel'],
  },
  { title: 'Liquide de frein', category: 'Freins', intervalMonths: 24 },
  { title: 'Contrôle plaquettes/disques de frein', category: 'Freins', intervalKm: 30000, intervalMonths: 12 },
  {
    title: 'Bougies d’allumage',
    category: 'Moteur',
    intervalKm: 60000,
    fuels: ['essence', 'hybride'],
  },
  { title: 'Liquide de refroidissement', category: 'Moteur', intervalKm: 150000, intervalMonths: 120 },
  { title: 'Courroie / chaîne de distribution', category: 'Moteur', intervalKm: 150000, intervalMonths: 120 },
  { title: 'Vidange boîte automatique', category: 'Transmission', intervalKm: 100000 },
  { title: 'Permutation / contrôle des pneus', category: 'Pneus', intervalKm: 10000, intervalMonths: 12 },
  { title: 'Remplacement des pneus', category: 'Pneus', intervalKm: 40000 },
  { title: 'Balais d’essuie-glace', category: 'Divers', intervalMonths: 12 },
  { title: 'Batterie (contrôle/remplacement)', category: 'Divers', intervalMonths: 48 },
]

// Préréglage générique pour un véhicule non-XC60.
const GENERIC_PRESETS: PresetTask[] = [
  { title: 'Vidange moteur + filtre à huile', category: 'Moteur', intervalKm: 15000, intervalMonths: 12 },
  { title: "Filtre d'habitacle", category: 'Filtres', intervalKm: 20000, intervalMonths: 12 },
  { title: 'Filtre à air', category: 'Filtres', intervalKm: 40000, intervalMonths: 24 },
  { title: 'Liquide de frein', category: 'Freins', intervalMonths: 24 },
  { title: 'Contrôle des freins', category: 'Freins', intervalKm: 20000, intervalMonths: 12 },
  { title: 'Permutation / contrôle des pneus', category: 'Pneus', intervalKm: 10000, intervalMonths: 12 },
]

export function presetTasksFor(make: string, model: string, fuel: FuelType): PresetTask[] {
  const isXC60 =
    make.trim().toLowerCase() === 'volvo' && model.trim().toLowerCase().replace(/\s/g, '') === 'xc60'
  const source = isXC60 ? XC60_PRESETS : GENERIC_PRESETS
  return source.filter((p) => !p.fuels || p.fuels.includes(fuel))
}

// Catégories proposées dans les sélecteurs.
export const EXPENSE_CATEGORIES = [
  'Réparation',
  'Entretien',
  'Pneus',
  'Assurance',
  'Carburant',
  'Péage',
  'Parking',
  'Lavage',
  'Amende',
  'Accessoire',
  'Autre',
]

export const MAINTENANCE_CATEGORIES = [
  'Moteur',
  'Filtres',
  'Freins',
  'Pneus',
  'Transmission',
  'Carrosserie',
  'Électrique',
  'Divers',
]
