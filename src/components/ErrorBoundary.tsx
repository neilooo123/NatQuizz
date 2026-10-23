import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Filet de sécurité : si une page plante, on affiche un message
 * au lieu d'un écran blanc. (React impose une classe pour cela.)
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Erreur dans la page', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="notice error stack">
        <strong>Oups, cette page a rencontré un problème.</strong>
        <span className="small">{this.state.error.message}</span>
        <button type="button" className="btn btn-small" onClick={() => window.location.reload()}>
          Recharger
        </button>
      </div>
    )
  }
}
