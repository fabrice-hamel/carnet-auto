export type ThemeMode = 'light' | 'dark' | 'system'

const KEY = 'carnet-auto-theme'

export function getStoredTheme(): ThemeMode {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

export function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(mode: ThemeMode): void {
  localStorage.setItem(KEY, mode)
  applyTheme(mode)
}

export function applyStoredTheme(): void {
  applyTheme(getStoredTheme())
  // Réagit aux changements système quand on est en mode "system".
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}
