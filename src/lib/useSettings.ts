import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, getSettings } from '../db/db'
import type { Settings } from '../db/types'

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS
}
