// Types du domaine. Toutes les dates sont stockées en chaîne ISO 'yyyy-MM-dd'
// (sauf createdAt qui est un timestamp ISO complet) pour rester lisibles et exportables.

export type FuelType = 'essence' | 'diesel' | 'hybride' | 'electrique' | 'gpl'

export interface Vehicle {
  id?: number
  name: string // ex. "XC60 de Fabrice"
  make: string // marque
  model: string
  plate?: string // immatriculation
  vin?: string
  fuel: FuelType
  firstRegistration?: string // 1ère immatriculation 'yyyy-MM-dd' -> base du contrôle technique
  currentMileage: number // dernier kilométrage relevé
  mileageDate: string // date de ce relevé 'yyyy-MM-dd'
  avgKmPerYear: number // pour estimer le km courant entre deux relevés
  color?: string // accent personnalisé
  photo?: string // dataURL (optionnel)
  archived?: boolean
  createdAt: string
}

// Tâche d'entretien récurrente (modèle d'échéance km ET/OU temps)
export interface MaintenanceTask {
  id?: number
  vehicleId: number
  title: string
  category: string // ex. "Vidange", "Freins", "Filtres"
  intervalKm?: number // périodicité en km (optionnelle)
  intervalMonths?: number // périodicité en mois (optionnelle)
  lastDoneKm?: number
  lastDoneDate?: string // 'yyyy-MM-dd'
  notes?: string
  active: boolean
  createdAt: string
}

// Intervention réalisée (historique). Peut clôturer une MaintenanceTask.
export interface ServiceRecord {
  id?: number
  vehicleId: number
  taskId?: number // tâche d'entretien associée (optionnel)
  date: string
  mileage: number
  title: string
  cost?: number
  vendor?: string // garage / prestataire
  notes?: string
  documentIds?: number[]
  createdAt: string
}

export interface FuelEntry {
  id?: number
  vehicleId: number
  date: string
  mileage: number
  quantity: number // litres ou kWh
  unitPrice?: number // prix unitaire
  totalCost?: number
  fullTank: boolean // plein complet (nécessaire au calcul de conso)
  station?: string
  notes?: string
  createdAt: string
}

export interface Expense {
  id?: number
  vehicleId: number
  date: string
  mileage?: number
  category: string // ex. "Assurance", "Pneus", "Parking", "Réparation"
  amount: number
  notes?: string
  documentIds?: number[]
  createdAt: string
}

export type DeadlineType = 'controle_technique' | 'assurance' | 'critair' | 'garantie' | 'autre'

export interface Deadline {
  id?: number
  vehicleId: number
  type: DeadlineType
  title: string
  dueDate: string // 'yyyy-MM-dd'
  recurrenceMonths?: number // pour reconduire automatiquement (CT = 24)
  notes?: string
  documentIds?: number[]
  createdAt: string
}

export type DocumentType =
  | 'facture'
  | 'carte_grise'
  | 'assurance'
  | 'controle_technique'
  | 'photo'
  | 'autre'

export interface DocumentBlob {
  id?: number
  vehicleId: number
  type: DocumentType
  title: string
  date: string
  dataUrl: string // image encodée (dataURL)
  createdAt: string
}

export interface Settings {
  id?: number
  theme: 'light' | 'dark' | 'system'
  soonDays: number // seuil "bientôt" en jours
  soonKm: number // seuil "bientôt" en km
}
