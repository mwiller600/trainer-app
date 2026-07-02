import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import ClientScreen from './pages/ClientScreen'
import AddClient from './pages/AddClient'
import type { Client } from './types'

type View =
  | { screen: 'dashboard' }
  | { screen: 'client'; client: Client }
  | { screen: 'add-client' }

export default function App() {
  const [view, setView] = useState<View>({ screen: 'dashboard' })

  if (view.screen === 'client') {
    return (
      <ClientScreen
        client={view.client}
        onBack={() => setView({ screen: 'dashboard' })}
      />
    )
  }

  if (view.screen === 'add-client') {
    return (
      <AddClient
        onBack={() => setView({ screen: 'dashboard' })}
        onSaved={(client) => setView({ screen: 'client', client })}
      />
    )
  }

  return (
    <Dashboard
      onSelectClient={(client) => setView({ screen: 'client', client })}
      onAddClient={() => setView({ screen: 'add-client' })}
    />
  )
}
