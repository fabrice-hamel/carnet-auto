import { addMonths, addYears, parseISO, format } from 'date-fns'

// Règles du contrôle technique français (voitures particulières) :
// - 1ère visite au plus tard 4 ans après la 1ère immatriculation.
// - puis tous les 2 ans.
// - contre-visite obligatoire sous 2 mois en cas de défaillance majeure.
// Source : service-public.gouv.fr (F2878), ecologie.gouv.fr.

export const CT_FIRST_YEARS = 4
export const CT_RECURRENCE_MONTHS = 24
export const CT_COUNTERVISIT_MONTHS = 2

/** Date du 1er contrôle technique (échéance) à partir de la 1ère immatriculation. */
export function firstCTDate(firstRegistrationISO: string): string {
  return format(addYears(parseISO(firstRegistrationISO), CT_FIRST_YEARS), 'yyyy-MM-dd')
}

/** Prochaine échéance après un CT validé à la date donnée. */
export function nextCTAfter(lastCTISO: string): string {
  return format(addMonths(parseISO(lastCTISO), CT_RECURRENCE_MONTHS), 'yyyy-MM-dd')
}

/** Échéance de contre-visite après une défaillance majeure. */
export function counterVisitDeadline(failISO: string): string {
  return format(addMonths(parseISO(failISO), CT_COUNTERVISIT_MONTHS), 'yyyy-MM-dd')
}
