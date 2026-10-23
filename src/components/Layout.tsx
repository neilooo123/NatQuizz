import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { ErrorBoundary } from './ErrorBoundary'
import { Icon, type IconName } from './Icon'
import { SyncIndicator } from './SyncIndicator'

const NAV: { to: string; label: string; icon: IconName; main?: boolean }[] = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/especes', label: 'Espèces', icon: 'leaf' },
  { to: '/observer', label: 'Observer', icon: 'camera', main: true },
  { to: '/quiz', label: 'Quiz', icon: 'quiz' },
  { to: '/reglages', label: 'Réglages', icon: 'settings' },
]

/** Cadre commun à toutes les pages : en-tête, contenu, barre de navigation. */
export function Layout() {
  const { pathname } = useLocation()
  // Chaque nouvelle page s'affiche en partant du haut.
  // (Accolades obligatoires : un effet ne doit rien renvoyer d'autre qu'une
  // fonction de nettoyage, or scrollTo renvoie une promesse dans les navigateurs récents.)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          NatQuizz
        </Link>
        <SyncIndicator />
      </header>

      <main className="page">
        {/* key : l'erreur éventuelle est oubliée dès qu'on change de page. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav className="bottom-nav" aria-label="Navigation principale">
        <div className="bottom-nav-inner">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={item.main ? 'nav-main' : undefined}>
              {item.main ? (
                <span className="nav-bubble">
                  <Icon name={item.icon} size={24} />
                </span>
              ) : (
                <Icon name={item.icon} />
              )}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
