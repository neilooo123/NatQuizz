import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { Layout } from './components/Layout'
import { openUserDb } from './db/db'
import { isSupabaseConfigured } from './lib/supabase'
import { EditObservationPage } from './pages/EditObservationPage'
import { HomePage } from './pages/HomePage'
import { ImportPage } from './pages/ImportPage'
import { NewObservationPage } from './pages/NewObservationPage'
import { QuizPage } from './pages/QuizPage'
import { SettingsPage } from './pages/SettingsPage'
import { SpeciesDetailPage } from './pages/SpeciesDetailPage'
import { SpeciesListPage } from './pages/SpeciesListPage'
import { setSyncStatus } from './sync/status'
import { startAutoSync } from './sync/sync'

// Le scanner (lecteur de QR code) n'est chargé que quand on en a besoin.
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })))

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AuthProvider>
  )
}

/** Choisit quoi afficher : configuration manquante, connexion, ou l'appli. */
function Gate() {
  const { user, loading } = useAuth()

  if (!isSupabaseConfigured && !import.meta.env.DEV) return <ConfigMissing />
  if (loading && !user) return <Splash />
  if (!user) return <LoginPage />
  // key : tout est recréé si un autre utilisateur se connecte.
  return <UserApp key={user.id} userId={user.id} />
}

function UserApp({ userId }: { userId: string }) {
  const { localMode } = useAuth()
  // La base locale de l'utilisateur est ouverte avant le premier affichage.
  useState(() => openUserDb(userId))

  useEffect(() => {
    openUserDb(userId)
    // Demande au navigateur de ne jamais effacer nos données.
    void navigator.storage?.persist?.()
    if (localMode) {
      setSyncStatus({ state: 'disabled' })
      return
    }
    return startAutoSync()
  }, [userId, localMode])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="observer" element={<NewObservationPage />} />
        <Route path="especes" element={<SpeciesListPage />} />
        <Route path="especes/:id" element={<SpeciesDetailPage />} />
        <Route path="observations/:id" element={<EditObservationPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route
          path="scanner"
          element={
            <Suspense fallback={null}>
              <ScanPage />
            </Suspense>
          }
        />
        <Route path="import" element={<ImportPage />} />
        <Route path="reglages" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Splash() {
  return (
    <div className="center-screen">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="NatQuizz" width={80} height={80} />
    </div>
  )
}

function ConfigMissing() {
  return (
    <div className="center-screen">
      <div className="card stack" style={{ maxWidth: 460 }}>
        <h1>Configuration manquante</h1>
        <p>
          L'adresse et la clé du projet Supabase ne sont pas renseignées (variables <code>VITE_SUPABASE_URL</code> et{' '}
          <code>VITE_SUPABASE_KEY</code>).
        </p>
        <p className="muted small">Voir le fichier README.md du projet.</p>
      </div>
    </div>
  )
}
