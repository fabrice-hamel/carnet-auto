import { NavLink, useLocation } from 'react-router-dom'
import { Gauge, Car, Settings as SettingsIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: Gauge, end: true },
  { to: '/vehicules', label: 'Véhicules', icon: Car, end: false },
  { to: '/reglages', label: 'Réglages', icon: SettingsIcon, end: false },
]

export default function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation()
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl lg:gap-6 lg:px-6">
      {/* Rail latéral (grand écran / Z Fold déplié) */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:py-6">
        <div className="mb-8 flex items-center gap-2 px-3">
          <Logo />
          <span className="text-lg font-bold">Carnet Auto</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenu */}
      <main className="w-full flex-1 px-4 pb-28 pt-4 lg:px-0 lg:pb-10">
        {/* En-tête mobile */}
        <header className="mb-2 flex items-center gap-2 lg:hidden">
          <Logo />
          <span className="text-base font-bold">Carnet Auto</span>
        </header>
        {children}
      </main>

      {/* Barre de navigation du bas (mobile / Z Fold plié) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-brand-950/90 lg:hidden">
        <div
          className="mx-auto flex max-w-md items-stretch justify-around"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const active = end ? loc.pathname === to : loc.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400'
                }`}
              >
                <Icon size={22} />
                {label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden>
      <rect width="64" height="64" rx="14" className="fill-brand-900" />
      <path
        d="M14 38c0-1 .5-2 1.4-2.6l2.1-7.2C18.2 25.4 20.4 24 22.8 24h18.4c2.4 0 4.6 1.4 5.3 4.2l2.1 7.2c.9.6 1.4 1.6 1.4 2.6v6a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2H20v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
        className="fill-brand-300"
      />
      <circle cx="21" cy="40" r="2.6" className="fill-brand-900" />
      <circle cx="43" cy="40" r="2.6" className="fill-brand-900" />
    </svg>
  )
}
