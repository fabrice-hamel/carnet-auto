import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto mt-16 max-w-md px-6 text-center">
          <h1 className="text-xl font-bold">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            L'application a rencontré un problème. Vos données sont conservées sur l'appareil.
          </p>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-100 p-3 text-left text-xs text-red-600 dark:bg-white/5">
            {this.state.error.message}
          </pre>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>
            Recharger l'application
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
